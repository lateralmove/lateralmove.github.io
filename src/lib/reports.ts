// Analytics report definitions, shared by the dashboard (top-N preview) and the
// full-report pages (/analytics/[slug]). Framework-agnostic — no React here so it
// can be imported by both server (generateStaticParams) and client components.
import type { EntityType, SearchDoc } from "./types";

export interface RankItem {
  id: string;
  type: EntityType;
  name: string;
  value: number;
  /** Human-readable value override (e.g. a duration like "2.4 yr"); falls back to `value`. */
  display?: string;
}

export interface RankReport {
  slug: string;
  title: string;
  /** unit of the metric, e.g. "groups", "techniques" */
  unit: string;
  blurb: string;
  /** Optional caveat shown as a footnote on the full report page. */
  note?: string;
  build: (docs: SearchDoc[]) => RankItem[];
}

function rank(docs: SearchDoc[], type: EntityType, value: (d: SearchDoc) => number): RankItem[] {
  return docs
    .filter((d) => d.type === type)
    .map((d) => ({ id: d.id, type, name: d.name, value: value(d) }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

/** Humanize a day count into the largest sensible unit for compact display. */
function humanDuration(days: number): string {
  if (days >= 365) return `${(days / 365).toFixed(1)} yr`;
  if (days >= 30) return `${Math.round(days / 30)} mo`;
  return `${Math.round(days)} d`;
}

export const RANK_REPORTS: RankReport[] = [
  {
    slug: "techniques-by-groups",
    title: "Techniques by group usage",
    unit: "groups",
    blurb: "Which techniques are used by the most distinct threat groups.",
    build: (d) => rank(d, "technique", (x) => x.groups ?? 0),
  },
  {
    slug: "techniques-by-software",
    title: "Most commoditized techniques",
    unit: "software",
    blurb: "Techniques implemented by the most distinct malware and tools.",
    build: (d) => rank(d, "technique", (x) => x.software ?? 0),
  },
  {
    slug: "unmitigated-techniques-by-groups",
    title: "Most-used techniques with no mitigation",
    unit: "groups",
    blurb: "Top exposure: techniques no ATT&CK mitigation covers, ranked by how many groups use them.",
    note: "ATT&CK v19 ships a detection strategy for every technique, so mitigation is the meaningful coverage gap. These are the uncovered techniques ordered by threat prevalence — lean on detection or compensating controls.",
    build: (d) => rank(d, "technique", (x) => (x.hasMitigation === false ? x.groups ?? 0 : 0)),
  },
  {
    slug: "software-by-groups",
    title: "Software used by most groups",
    unit: "groups",
    blurb: "Malware and tools wielded by the largest number of groups.",
    build: (d) => rank(d, "software", (x) => x.groups ?? 0),
  },
  {
    slug: "groups-by-techniques",
    title: "Most prolific groups",
    unit: "techniques",
    blurb: "Groups with the broadest technique repertoire.",
    build: (d) => rank(d, "group", (x) => x.techniques ?? 0),
  },
  {
    slug: "groups-by-software",
    title: "Groups using the most software",
    unit: "software",
    blurb: "Groups associated with the most malware and tools.",
    build: (d) => rank(d, "group", (x) => x.software ?? 0),
  },
  {
    slug: "software-by-techniques",
    title: "Most capable software",
    unit: "techniques",
    blurb: "Software implementing the most techniques.",
    build: (d) => rank(d, "software", (x) => x.techniques ?? 0),
  },
  {
    slug: "mitigations-by-techniques",
    title: "Mitigations covering most techniques",
    unit: "techniques",
    blurb: "Highest-leverage mitigations by technique coverage.",
    build: (d) => rank(d, "mitigation", (x) => x.techniques ?? 0),
  },
  {
    slug: "data-components-by-techniques",
    title: "Data components detecting most techniques",
    unit: "techniques",
    blurb: "Log sources / data components with the widest detection reach.",
    build: (d) => rank(d, "data-component", (x) => x.techniques ?? 0),
  },
  {
    slug: "campaigns-by-duration",
    title: "Longest-running campaigns",
    unit: "duration",
    blurb: "Campaigns with the longest span from first to last observed activity.",
    note: "One upstream start date — C0059 (Salesforce Data Exfiltration) — was corrected from 2004 to 2024 pending a fix reported to MITRE.",
    build: (docs) =>
      docs
        .filter((d) => d.type === "campaign")
        .map((d) => {
          const first = d.firstSeen ? Date.parse(d.firstSeen) : NaN;
          const last = d.lastSeen ? Date.parse(d.lastSeen) : NaN;
          const days = (last - first) / 86_400_000;
          return { id: d.id, type: "campaign" as const, name: d.name, value: days, display: humanDuration(days) };
        })
        .filter((i) => i.value > 0)
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)),
  },
];

export const reportBySlug = (slug: string) => RANK_REPORTS.find((r) => r.slug === slug);
