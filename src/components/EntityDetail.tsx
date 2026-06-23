import Link from "next/link";
import type { Entity, Technique } from "@/lib/types";
import { entityJsonLd } from "@/lib/seo";
import { plural } from "@/lib/plural";
import { TypeChip, CoverageBadge } from "./Chip";
import { Markdown } from "./Markdown";
import { RelationshipSection } from "./RelationshipSection";

export function EntityDetail({ entity }: { entity: Entity }) {
  return (
    <div className="space-y-6">
      {/* Structured data: breadcrumb trail + Article node (mirrors the visible breadcrumb below). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            entityJsonLd(entity.type, entity, entity.type === "technique" ? (entity as Technique).parent : null),
          ),
        }}
      />
      {/* header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Breadcrumb entity={entity} />
          {entity.type === "software" && (
            <span className="chip">{(entity as Extract<Entity, { type: "software" }>).softwareType}</span>
          )}
          {entity.url && (
            <a href={entity.url} target="_blank" rel="noopener noreferrer" className="link ml-auto text-xs">
              View on attack.mitre.org ↗
            </a>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{entity.name}</h1>
        {entity.type === "technique" && (entity as Technique).parent && (
          <p className="text-sm text-neutral-500">
            Sub-technique of{" "}
            <a className="link" href={`/techniques/${(entity as Technique).parent!.id}/`}>
              {(entity as Technique).parent!.name}
            </a>
          </p>
        )}
        {entity.description && (
          <Markdown
            className="max-w-3xl text-sm text-neutral-700 dark:text-neutral-300"
            >{entity.description}</Markdown>
        )}
      </header>

      <Facts entity={entity} />
      <Sections entity={entity} />
    </div>
  );
}

function Breadcrumb({ entity }: { entity: Entity }) {
  // Leads with the colored type chip (clickable → search filtered to this type), then
  // the parent technique for a sub-technique, then the current id (not a link). "Matrix"
  // is omitted — the header already links home.
  const parent = entity.type === "technique" ? (entity as Technique).parent : null;

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-neutral-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li className="flex items-center gap-1.5">
          <TypeChip type={entity.type} href={`/search/?type=${entity.type}`} />
          <span aria-hidden="true">/</span>
        </li>
        {parent && (
          <li className="flex items-center gap-1.5">
            <Link href={`/techniques/${parent.id}/`} className="font-mono hover:underline">
              {parent.id}
            </Link>
            <span aria-hidden="true">/</span>
          </li>
        )}
        <li aria-current="page" className="font-mono text-neutral-500 dark:text-neutral-300">
          {entity.id}
        </li>
      </ol>
    </nav>
  );
}

function Sections({ entity }: { entity: Entity }) {
  switch (entity.type) {
    case "technique": {
      const t = entity;
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {t.relationships.subtechniques.length > 0 && (
            <div className="sm:col-span-2">
              <RelationshipSection
                title="Sub-techniques"
                items={t.relationships.subtechniques}
                initial={t.relationships.subtechniques.length}
              />
            </div>
          )}
          <RelationshipSection title="Used by groups" items={t.relationships.usedByGroups} initial={6} />
          <RelationshipSection title="Used by software" items={t.relationships.usedBySoftware} initial={6} />
          <RelationshipSection title="Used in campaigns" items={t.relationships.usedByCampaigns} initial={6} />
          <RelationshipSection title="Detected via data components" items={t.detection.dataComponents} initial={6} />
          <div className="sm:col-span-2">
            <RelationshipSection
              title="Mitigated by"
              items={t.relationships.mitigatedBy}
              describe
              accent="border-l-2 border-l-emerald-500"
            />
          </div>
          <div className="sm:col-span-2">
            <DetectionBlock t={t} />
          </div>
        </div>
      );
    }
    case "group":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <RelationshipSection title="Uses techniques" items={entity.relationships.usesTechniques} />
          <RelationshipSection title="Uses software" items={entity.relationships.usesSoftware} />
          <RelationshipSection title="Campaigns" items={entity.relationships.attributedCampaigns} />
        </div>
      );
    case "software":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <RelationshipSection title="Uses techniques" items={entity.relationships.usesTechniques} />
          <RelationshipSection title="Used by groups" items={entity.relationships.usedByGroups} />
          <RelationshipSection title="Used in campaigns" items={entity.relationships.usedByCampaigns} />
        </div>
      );
    case "campaign":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <RelationshipSection title="Attributed to" items={entity.relationships.attributedTo} />
          <RelationshipSection title="Uses techniques" items={entity.relationships.usesTechniques} />
          <RelationshipSection title="Uses software" items={entity.relationships.usesSoftware} />
        </div>
      );
    case "mitigation":
      return <RelationshipSection title="Mitigates techniques" items={entity.relationships.mitigatesTechniques} />;
    case "data-component":
      // Full-width stacked sections (not a half-width 2-col grid), and show every
      // detected technique up front (initial = length disables the "Show all" collapse).
      return (
        <div className="space-y-4">
          <RelationshipSection
            title="Detects techniques"
            items={entity.relationships.detectsTechniques}
            initial={entity.relationships.detectsTechniques.length}
          />
          <LogSources items={entity.logSources} />
          <DetectionStrategyList items={entity.detectionStrategies} />
        </div>
      );
  }
}

function LogSources({ items }: { items: { name?: string; channel?: string }[] }) {
  return (
    <section className="card p-4">
      <h3 className="mb-2 text-sm font-semibold">
        Log sources{" "}
        <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {items.length}
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">None recorded in ATT&CK.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((ls, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono text-xs text-neutral-500">{ls.name}</span>
              {ls.channel && <span className="text-neutral-500">· {ls.channel}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DetectionStrategyList({ items }: { items: { id: string; name: string; techniqueId?: string }[] }) {
  return (
    <section className="card p-4">
      <h3 className="mb-2 text-sm font-semibold">
        Detection strategies{" "}
        <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {items.length}
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">None recorded in ATT&CK.</p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {items.map((s) => (
            <li key={s.id} className="flex items-baseline gap-1.5 text-sm">
              {s.techniqueId ? (
                <a className="link font-mono text-xs" href={`/techniques/${s.techniqueId}/`} title={`Technique ${s.techniqueId}`}>
                  {s.id}
                </a>
              ) : (
                <span className="font-mono text-xs text-neutral-400">{s.id}</span>
              )}
              <span className="truncate">{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DetectionBlock({ t }: { t: Technique }) {
  // ATT&CK maps exactly one detection strategy per technique, so render it inline
  // with the section title rather than as a separate nested box.
  const s = t.detection.strategies[0];
  if (!s) return null;
  return (
    <section className="card border-l-2 border-l-blue-500 p-4">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-sm font-semibold">Detection strategies</h3>
        <span className="font-mono text-xs text-neutral-400">{s.id}</span>
        <span className="text-sm text-neutral-600 dark:text-neutral-300">{s.name}</span>
        <span className="text-xs text-neutral-400">· {plural(s.analytics.length, "analytic")}</span>
      </div>
      <ul className="space-y-2">
        {s.analytics.map((a) => (
          <li key={a.id} className="text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <span className="font-mono text-neutral-400">{a.id}</span>
              {a.platforms.length > 0 && <span className="text-neutral-400">({a.platforms.join(", ")})</span>}
            </div>
            {a.description && (
              <Markdown className="mt-0.5 text-neutral-600 dark:text-neutral-300">{a.description}</Markdown>
            )}
            <ul className="mt-0.5 list-inside list-disc text-neutral-500">
              {a.logSources.map((ls, i) => (
                <li key={i}>
                  {ls.component}
                  {ls.channel ? <span className="text-neutral-400"> · {ls.channel}</span> : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Facts({ entity }: { entity: Entity }) {
  const rows: { label: string; value: React.ReactNode }[] = [];

  if ("platforms" in entity && entity.platforms.length > 0)
    rows.push({ label: "Platforms", value: <ChipList items={entity.platforms} /> });

  if (entity.type === "technique") {
    rows.push({ label: "Tactics", value: <ChipList items={entity.tactics.map((t) => t.name)} /> });
    rows.push({
      label: "Coverage",
      value: (
        <div className="flex flex-wrap gap-1.5">
          <CoverageBadge ok={entity.coverage.hasMitigation} label="mitigation" />
          <CoverageBadge ok={entity.coverage.hasDetection} label="detection" />
        </div>
      ),
    });
  }
  if ((entity.type === "group" || entity.type === "software") && entity.aliases.length > 0)
    rows.push({ label: "Aliases", value: <ChipList items={entity.aliases} /> });
  if (entity.type === "campaign") {
    if (entity.firstSeen) rows.push({ label: "First seen", value: fmtDate(entity.firstSeen) });
    if (entity.lastSeen) rows.push({ label: "Last seen", value: fmtDate(entity.lastSeen) });
  }
  if (entity.type === "data-component" && entity.relationships.analytics.length > 0)
    rows.push({ label: "Analytics", value: String(entity.relationships.analytics.length) });

  if (rows.length === 0) return null;
  return (
    <dl className="card flex flex-wrap gap-x-10 gap-y-3 p-4 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="min-w-0">
          <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="chip">
          {i}
        </span>
      ))}
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}
