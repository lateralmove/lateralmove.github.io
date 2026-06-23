// Build-time data pipeline: MITRE ATT&CK Enterprise STIX 2.1 bundle -> normalized,
// pre-indexed JSON shards consumed by the app. Targets the ATT&CK v19 schema, whose
// detection model is:
//
//   technique  <--detects--  detection-strategy  --(analytic_refs)-->  analytic
//                                                  analytic --(log_source_refs)--> data-component (+ channel)
//
//   public/data/
//     meta.json        - version + counts
//     matrix.json      - ordered tactics -> techniques (with coverage flags) for the Smart Matrix
//     search.json      - lightweight doc set for faceted client search
//     search-index.json- pre-serialized MiniSearch index (skips client-side re-indexing)
//     manifest.json    - entity ids per type (for generateStaticParams + list pages)
//     entities/<type>/<id>.json - per-entity detail incl. resolved relationships (+ neighbors for the scoped graph)
//
// Run: node scripts/build-data.mjs   (cached download in .cache/)

import { mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import MiniSearch from "minisearch";
import { MINISEARCH_OPTIONS, toIndexedDocs } from "../src/lib/searchConfig.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache");
const OUT = path.join(ROOT, "public", "data");
const SRC_URL =
  "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json";
const CACHE_FILE = path.join(CACHE, "enterprise-attack.json");

// Known upstream data errors, patched here until fixed at the source. Keyed by ATT&CK id.
// Remove an entry once the corresponding MITRE bundle ships the fix.
//   C0059 "Salesforce Data Exfiltration": first_seen 2004-10-01 is a typo for 2024-10-01
//   (STIX object created 2025-10, last_seen 2025-09). Reported to MITRE.
const DATA_CORRECTIONS = {
  C0059: { first_seen: "2024-10-01T04:00:00.000Z" },
};

// ----------------------------------------------------------------------------- helpers
const log = (...a) => console.log("[build-data]", ...a);

const attackRef = (o) => (o.external_references ?? []).find((r) => r.source_name === "mitre-attack");
const attackId = (o) => attackRef(o)?.external_id ?? null;
const attackUrl = (o) => attackRef(o)?.url ?? null;
const isLive = (o) => !o.revoked && !o.x_mitre_deprecated;

// Full description as clean Markdown: drop citation noise, turn <code> into
// backticks and <br> into newlines, drop stray inline tags, but PRESERVE the
// paragraph/list structure (newlines + markdown links) for proper rendering.
function cleanMarkdown(s) {
  if (!s) return "";
  return s
    .replace(/\(Citation:[^)]*\)/g, "")
    .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(?:span|p|b|i|strong|em|div)[^>]*>/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
// Flattened single-line version for search rows / previews.
function cleanInline(s) {
  if (!s) return "";
  return s
    .replace(/\(Citation:[^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const truncate = (s, n = 240) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

const TYPE_OF = {
  "attack-pattern": "technique",
  "intrusion-set": "group",
  malware: "software",
  tool: "software",
  campaign: "campaign",
  "course-of-action": "mitigation",
  "x-mitre-data-component": "data-component",
  "x-mitre-tactic": "tactic",
};
const ROUTE_OF = {
  technique: "techniques",
  group: "groups",
  software: "software",
  campaign: "campaigns",
  mitigation: "mitigations",
  "data-component": "data-components",
};

// ----------------------------------------------------------------------------- download (cached)
async function loadBundle() {
  await mkdir(CACHE, { recursive: true });
  if (existsSync(CACHE_FILE)) {
    const age = (Date.now() - (await stat(CACHE_FILE)).mtimeMs) / 86_400_000;
    log(`using cached bundle (${age.toFixed(1)}d old) - delete .cache/ to refresh`);
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  }
  log("downloading Enterprise STIX bundle (~40MB)...");
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  await writeFile(CACHE_FILE, text);
  log("cached ->", path.relative(ROOT, CACHE_FILE));
  return JSON.parse(text);
}

// ----------------------------------------------------------------------------- main
async function main() {
  const bundle = await loadBundle();
  const objects = bundle.objects ?? [];
  log(`parsed ${objects.length} STIX objects`);

  const byId = new Map(objects.map((o) => [o.id, o]));
  const collection = objects.find((o) => o.type === "x-mitre-collection");
  const live = objects.filter(isLive);

  // Tactics, ordered via the matrix object's tactic_refs.
  const matrix = objects.find((o) => o.type === "x-mitre-matrix");
  const tacticById = new Map(live.filter((o) => o.type === "x-mitre-tactic").map((t) => [t.id, t]));
  const orderedTactics = (matrix?.tactic_refs ?? []).map((id) => tacticById.get(id)).filter(Boolean);
  const tacticByShort = new Map([...tacticById.values()].map((t) => [t.x_mitre_shortname, t]));

  // Compact reference embedded in relationship lists / search.
  function ref(id) {
    const o = byId.get(id);
    if (!o) return null;
    const type = TYPE_OF[o.type];
    if (!type) return null;
    return { id: attackId(o) ?? o.id, name: o.name, type };
  }

  // --------------------------------------------------------------------------- generic relationships
  const rel = new Map(); // stixId -> { key: ref[] }
  const push = (stixId, key, value) => {
    if (!value) return;
    const e = rel.get(stixId) ?? {};
    (e[key] ??= []).push(value);
    rel.set(stixId, e);
  };

  for (const r of live) {
    if (r.type !== "relationship") continue;
    const src = byId.get(r.source_ref);
    const tgt = byId.get(r.target_ref);
    if (!src || !tgt || !isLive(src) || !isLive(tgt)) continue;
    const sType = TYPE_OF[src.type];
    const tType = TYPE_OF[tgt.type];

    switch (r.relationship_type) {
      case "uses":
        if (tType === "technique") {
          push(tgt.id, `usedBy_${sType}`, ref(src.id));
          push(src.id, "usesTechniques", ref(tgt.id));
        } else if (tType === "software") {
          push(tgt.id, `usedBy_${sType}`, ref(src.id));
          push(src.id, "usesSoftware", ref(tgt.id));
        }
        break;
      case "mitigates": {
        // Carry the relationship (SRO) description: the technique-specific guidance
        // for applying this mitigation (this is what attack.mitre.org shows per edge).
        const m = ref(src.id);
        push(tgt.id, "mitigatedBy", m && { ...m, description: cleanMarkdown(r.description) });
        push(src.id, "mitigatesTechniques", ref(tgt.id));
        break;
      }
      case "subtechnique-of":
        push(tgt.id, "subtechniques", ref(src.id));
        push(src.id, "parentTechnique", ref(tgt.id));
        break;
      case "attributed-to":
        push(src.id, "attributedTo", ref(tgt.id));
        push(tgt.id, "attributedCampaigns", ref(src.id));
        break;
      default:
        break;
    }
  }
  const relOf = (id) => rel.get(id) ?? {};

  // --------------------------------------------------------------------------- detection chain (v19)
  // data-component attackId -> display name
  const dcNameById = new Map(
    live.filter((o) => o.type === "x-mitre-data-component").map((c) => [attackId(c), c.name])
  );
  // analytic stixId -> { id, name, platforms, logSources:[{component, channel, dataComponentId}] }
  const analyticById = new Map();
  for (const a of live.filter((o) => o.type === "x-mitre-analytic")) {
    const logSources = (a.x_mitre_log_source_references ?? []).map((ls) => {
      const dc = byId.get(ls.x_mitre_data_component_ref);
      return { component: ls.name ?? dc?.name ?? null, channel: ls.channel ?? null, dataComponentId: dc ? attackId(dc) : null };
    });
    analyticById.set(a.id, { id: attackId(a), name: a.name, description: a.description ?? null, platforms: a.x_mitre_platforms ?? [], logSources });
  }

  // detection-strategy stixId -> { id, name, analytics:[...] }
  const stratById = new Map();
  for (const s of live.filter((o) => o.type === "x-mitre-detection-strategy")) {
    const analytics = (s.x_mitre_analytic_refs ?? []).map((id) => analyticById.get(id)).filter(Boolean);
    stratById.set(s.id, { id: attackId(s), name: s.name, analytics });
  }

  // technique stixId -> detection strategy stixIds (from `detects` relationships)
  const stratsForTech = new Map();
  for (const r of live) {
    if (r.type === "relationship" && r.relationship_type === "detects") {
      const arr = stratsForTech.get(r.target_ref) ?? [];
      arr.push(r.source_ref);
      stratsForTech.set(r.target_ref, arr);
    }
  }

  // reverse: data-component attackId -> Set(technique attackId), plus analytics + detection strategies
  const techsByDc = new Map(); // dcId -> Set(techId)
  const analyticsByDc = new Map(); // dcId -> Map(anId -> name)
  const strategiesByDc = new Map(); // dcId -> Map(stratId -> { name, techniqueId })

  function detectionForTechnique(techStixId, techAttackId) {
    const strategies = (stratsForTech.get(techStixId) ?? [])
      .map((id) => stratById.get(id))
      .filter(Boolean);
    const dcSet = new Map(); // dcId -> name
    for (const strat of strategies) {
      for (const an of strat.analytics) {
        for (const ls of an.logSources) {
          if (!ls.dataComponentId) continue;
          dcSet.set(ls.dataComponentId, ls.component);
          // reverse maps
          if (!techsByDc.has(ls.dataComponentId)) techsByDc.set(ls.dataComponentId, new Set());
          techsByDc.get(ls.dataComponentId).add(techAttackId);
          if (!analyticsByDc.has(ls.dataComponentId)) analyticsByDc.set(ls.dataComponentId, new Map());
          analyticsByDc.get(ls.dataComponentId).set(an.id, an.name);
          if (!strategiesByDc.has(ls.dataComponentId)) strategiesByDc.set(ls.dataComponentId, new Map());
          // a detection strategy detects exactly one technique (techAttackId) — keep it for linking
          strategiesByDc.get(ls.dataComponentId).set(strat.id, { name: strat.name, techniqueId: techAttackId });
        }
      }
    }
    const dataComponents = [...dcSet.keys()]
      .map((id) => ({ id, name: dcNameById.get(id) ?? id, type: "data-component" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { strategies, dataComponents, hasDetection: strategies.length > 0 };
  }

  // --------------------------------------------------------------------------- list utils
  const dedupe = (arr) => {
    const seen = new Set();
    return (arr ?? []).filter((x) => {
      const k = x.id ?? `${x.component}|${x.channel}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  const sortByName = (arr) => [...arr].sort((a, b) => (a.name ?? a.id ?? "").localeCompare(b.name ?? b.id ?? ""));
  const clean = (arr) => sortByName(dedupe(arr));

  // --------------------------------------------------------------------------- output dirs
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const seg of Object.values(ROUTE_OF)) await mkdir(path.join(OUT, "entities", seg), { recursive: true });

  const manifest = { technique: [], group: [], software: [], campaign: [], mitigation: [], "data-component": [] };
  const search = [];
  const writeEntity = (type, id, data) =>
    writeFile(path.join(OUT, "entities", ROUTE_OF[type], `${id}.json`), JSON.stringify(data));

  // --------------------------------------------------------------------------- techniques
  const techniques = live
    .filter((o) => o.type === "attack-pattern")
    .map((t) => {
      const id = attackId(t);
      const tactics = (t.kill_chain_phases ?? [])
        .filter((p) => p.kill_chain_name === "mitre-attack")
        .map((p) => tacticByShort.get(p.phase_name))
        .filter(Boolean)
        .map((tac) => ({ id: attackId(tac), name: tac.name, shortName: tac.x_mitre_shortname }));
      const r = relOf(t.id);
      const mitigatedBy = clean(r.mitigatedBy);
      const detection = detectionForTechnique(t.id, id);
      return {
        id,
        stixId: t.id,
        type: "technique",
        name: t.name,
        isSubtechnique: !!t.x_mitre_is_subtechnique,
        parent: (r.parentTechnique ?? [])[0] ?? null,
        platforms: t.x_mitre_platforms ?? [],
        tactics,
        description: cleanMarkdown(t.description),
        url: attackUrl(t),
        relationships: {
          subtechniques: clean(r.subtechniques),
          usedByGroups: clean(r.usedBy_group),
          usedBySoftware: clean(r.usedBy_software),
          usedByCampaigns: clean(r.usedBy_campaign),
          mitigatedBy,
        },
        detection,
        coverage: { hasMitigation: mitigatedBy.length > 0, hasDetection: detection.hasDetection },
      };
    });
  const techById = new Map(techniques.map((t) => [t.id, t]));

  for (const t of techniques) {
    manifest.technique.push(t.id);
    await writeEntity("technique", t.id, t);
    search.push({
      id: t.id,
      type: "technique",
      name: t.name,
      sub: t.isSubtechnique,
      desc: truncate(cleanInline(t.description), 160),
      tactics: t.tactics.map((x) => x.name),
      platforms: t.platforms,
      groups: t.relationships.usedByGroups.length,
      software: t.relationships.usedBySoftware.length,
      hasMitigation: t.coverage.hasMitigation,
      hasDetection: t.coverage.hasDetection,
    });
  }

  // --------------------------------------------------------------------------- generic SDO writer
  async function emit(stixType, type, extra) {
    const list = live.filter((o) => (Array.isArray(stixType) ? stixType.includes(o.type) : o.type === stixType));
    for (const o of list) {
      const id = attackId(o);
      if (!id) continue;
      const r = relOf(o.id);
      const built = extra(o, r) ?? {};
      const searchExtra = built._search ?? {};
      delete built._search;
      const data = {
        id,
        stixId: o.id,
        type,
        name: o.name,
        description: cleanMarkdown(o.description),
        url: attackUrl(o),
        ...built,
      };
      manifest[type].push(id);
      await writeEntity(type, id, data);
      search.push({ id, type, name: o.name, desc: truncate(cleanInline(data.description), 160), ...searchExtra });
    }
  }

  await emit("intrusion-set", "group", (o, r) => {
    const usesT = clean(r.usesTechniques);
    return {
      aliases: (o.aliases ?? []).filter((a) => a !== o.name),
      relationships: {
        usesTechniques: usesT,
        usesSoftware: clean(r.usesSoftware),
        attributedCampaigns: clean(r.attributedCampaigns),
      },
      _search: { techniques: usesT.length, software: (r.usesSoftware ?? []).length },
    };
  });

  await emit(["malware", "tool"], "software", (o, r) => {
    const usesT = clean(r.usesTechniques);
    const byGroups = clean(r.usedBy_group);
    const byCampaigns = clean(r.usedBy_campaign);
    return {
      softwareType: o.type,
      platforms: o.x_mitre_platforms ?? [],
      aliases: (o.x_mitre_aliases ?? []).filter((a) => a !== o.name),
      relationships: { usesTechniques: usesT, usedByGroups: byGroups, usedByCampaigns: byCampaigns },
      _search: {
        kind: o.type,
        techniques: usesT.length,
        platforms: o.x_mitre_platforms ?? [],
        groups: byGroups.length,
        campaigns: byCampaigns.length,
      },
    };
  });

  await emit("campaign", "campaign", (o, r) => {
    const usesT = clean(r.usesTechniques);
    const usesS = clean(r.usesSoftware);
    const fix = DATA_CORRECTIONS[attackId(o)] ?? {};
    const firstSeen = fix.first_seen ?? o.first_seen ?? null;
    const lastSeen = fix.last_seen ?? o.last_seen ?? null;
    return {
      firstSeen,
      lastSeen,
      relationships: { attributedTo: clean(r.attributedTo), usesTechniques: usesT, usesSoftware: usesS },
      _search: {
        firstSeen,
        lastSeen,
        techniques: usesT.length,
        software: usesS.length,
      },
    };
  });

  await emit("course-of-action", "mitigation", (o, r) => {
    const mt = clean(r.mitigatesTechniques);
    return { relationships: { mitigatesTechniques: mt }, _search: { techniques: mt.length } };
  });

  // data components (v19): defender pivot = "which techniques can I detect with this log source?"
  await emit("x-mitre-data-component", "data-component", (o) => {
    const id = attackId(o);
    const techIds = [...(techsByDc.get(id) ?? [])];
    const detects = techIds
      .map((tid) => techById.get(tid))
      .filter(Boolean)
      .map((t) => ({ id: t.id, name: t.name, type: "technique" }));
    const analytics = [...(analyticsByDc.get(id) ?? new Map()).entries()].map(([aid, name]) => ({ id: aid, name }));
    const strategies = [...(strategiesByDc.get(id) ?? new Map()).entries()].map(([sid, v]) => ({ id: sid, name: v.name, techniqueId: v.techniqueId }));
    return {
      logSources: o.x_mitre_log_sources ?? [],
      detectionStrategies: sortByName(strategies),
      relationships: { detectsTechniques: clean(detects), analytics: sortByName(analytics) },
      _search: { techniques: detects.length },
    };
  });

  // --------------------------------------------------------------------------- matrix.json
  const techCard = (t) => ({
    id: t.id,
    name: t.name,
    platforms: t.platforms,
    hasMitigation: t.coverage.hasMitigation,
    hasDetection: t.coverage.hasDetection,
    groups: t.relationships.usedByGroups.length,
  });
  const matrixOut = {
    tactics: orderedTactics.map((tac) => {
      const short = tac.x_mitre_shortname;
      const techs = techniques
        .filter((t) => !t.isSubtechnique && t.tactics.some((x) => x.shortName === short))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => ({
          ...techCard(t),
          subtechniques: t.relationships.subtechniques
            .map((s) => techById.get(s.id))
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(techCard),
        }));
      return { id: attackId(tac), name: tac.name, shortName: short, techniques: techs };
    }),
  };

  // --------------------------------------------------------------------------- write indexes
  await writeFile(path.join(OUT, "matrix.json"), JSON.stringify(matrixOut));
  await writeFile(path.join(OUT, "search.json"), JSON.stringify(search));
  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest));

  // Pre-serialize the MiniSearch index so the client rehydrates it (loadJSON)
  // instead of re-tokenizing every doc in the main thread on first ⌘K / search.
  // Built from the same docs + options the client loads with (searchConfig.mjs).
  const searchIndex = new MiniSearch(MINISEARCH_OPTIONS);
  searchIndex.addAll(toIndexedDocs(search));
  await writeFile(path.join(OUT, "search-index.json"), JSON.stringify(searchIndex.toJSON()));

  const counts = Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, v.length]));
  const meta = {
    name: collection?.name ?? "MITRE ATT&CK Enterprise",
    version: collection?.x_mitre_version ?? null,
    domain: "enterprise",
    generatedAt: new Date().toISOString(),
    source: SRC_URL,
    counts,
    // Canonical kill-chain tactic order (from the matrix's tactic_refs), so the
    // search facet can sort tactics naturally instead of alphabetically.
    tactics: orderedTactics.map((t) => t.name),
  };
  await writeFile(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 2));

  log("done. counts:", counts);
  log("tactics:", matrixOut.tactics.length, "| search docs:", search.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
