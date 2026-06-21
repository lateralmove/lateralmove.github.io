"use client";

import Link from "next/link";
import { hrefFor } from "@/lib/entities";
import type { TacticColumn, TechCard } from "@/lib/types";

export type Overlay = "none" | "mitigation" | "group";

/** Shared props every matrix view receives from the orchestrator. */
export interface ViewProps {
  columns: TacticColumn[];
  overlay: Overlay;
  groupSet: Set<string>;
  showSub: boolean;
}

/** Strong, identical "used by this group" emphasis — applied the same way to a used
 *  technique AND a used sub-technique so they stand out equally. */
const GROUP_HIT = "border-l-2 border-l-amber-500 bg-amber-200 font-semibold dark:border-l-amber-400 dark:bg-amber-900/55";
/** One consistent "not used by this group" treatment. Applied at a single level only
 *  (a row/header, never a container) so it stays uniform and never compounds into a
 *  second, darker grey. Kept readable in both light and dark mode. */
const GROUP_MISS = "opacity-60";

/** Whether the group uses this technique (`hit`) or not (`miss`). */
function groupState(t: TechCard, overlay: Overlay, groupSet: Set<string>) {
  return {
    hit: overlay === "group" && groupSet.has(t.id),
    miss: overlay === "group" && !groupSet.has(t.id),
  };
}

/** Full technique card (Sections / Tabs / Columns views). */
export function Cell({ t, overlay, groupSet, showSub }: { t: TechCard } & Omit<ViewProps, "columns">) {
  const subs = t.subtechniques ?? [];
  const { hit, miss } = groupState(t, overlay, groupSet);
  const tone =
    overlay === "mitigation"
      ? t.hasMitigation
        ? "border-l-4 border-l-emerald-500"
        : "border-l-4 border-l-rose-500"
      : "";
  return (
    <div className={`card p-2 text-sm ${tone}`}>
      {/* Highlight a used parent / dim an unused one — on the header only, never the card — so used subs below stay lit. */}
      <div className={`rounded-sm ${hit ? GROUP_HIT : miss ? GROUP_MISS : ""}`}>
        <Link href={hrefFor("technique", t.id)} className="block hover:underline">
          <span className="font-mono text-[10px] text-neutral-400">{t.id}</span>
          <div className="leading-snug">{t.name}</div>
        </Link>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-400">
          {t.groups > 0 && <span title="groups observed">{t.groups}★</span>}
          <span title={t.hasMitigation ? "has mitigation" : "no mitigation"}>{t.hasMitigation ? "🛡" : "·"}</span>
          {subs.length > 0 && <span className="ml-auto">{subs.length} sub</span>}
        </div>
      </div>
      {showSub && subs.length > 0 && (
        <ul className="mt-1.5 space-y-1 border-t border-neutral-100 pt-1.5 dark:border-neutral-800">
          {subs.map((s) => {
            const subHit = overlay === "group" && groupSet.has(s.id);
            const subMiss = overlay === "group" && !groupSet.has(s.id);
            return (
              <li key={s.id} className={`rounded px-1 ${subHit ? GROUP_HIT : ""} ${subMiss ? GROUP_MISS : ""}`}>
                <Link href={hrefFor("technique", s.id)} className="flex items-baseline gap-1.5 text-xs hover:underline">
                  <span className="font-mono text-[9px] text-neutral-400">{s.id.split(".")[1]}</span>
                  <span className="truncate">{s.name}</span>
                  {overlay === "mitigation" && <span className="ml-auto">{s.hasMitigation ? "🛡" : "·"}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Compact one-line technique row (Panels / masonry view). */
export function CompactRow({ t, overlay, groupSet, showSub }: { t: TechCard } & Omit<ViewProps, "columns">) {
  const subs = t.subtechniques ?? [];
  const { hit, miss } = groupState(t, overlay, groupSet);
  const accent =
    overlay === "mitigation"
      ? t.hasMitigation
        ? "border-l-2 border-l-emerald-500"
        : "border-l-2 border-l-rose-500"
      : "";
  return (
    <li className={`pl-1.5 ${accent}`}>
      {/* Used parent / unused parent treatment lives on the row itself (GROUP_HIT/GROUP_MISS),
          identical to how sub-rows below are marked, so a used sub stays lit and equally bold. */}
      <Link
        href={hrefFor("technique", t.id)}
        className={`flex items-baseline gap-1.5 py-0.5 text-xs hover:underline ${hit ? GROUP_HIT : ""} ${miss ? GROUP_MISS : ""}`}
      >
        <span className="font-mono text-[9px] text-neutral-400">{t.id}</span>
        <span className="truncate">{t.name}</span>
        {t.groups > 0 && <span className="ml-auto shrink-0 text-[9px] text-neutral-400">{t.groups}★</span>}
      </Link>
      {showSub && subs.length > 0 && (
        <ul className="ml-3 border-l border-neutral-100 dark:border-neutral-800">
          {subs.map((s) => {
            const subHit = overlay === "group" && groupSet.has(s.id);
            const subMiss = overlay === "group" && !groupSet.has(s.id);
            return (
              <li key={s.id} className={`pl-1.5 ${subHit ? GROUP_HIT : ""} ${subMiss ? GROUP_MISS : ""}`}>
                <Link href={hrefFor("technique", s.id)} className="flex items-baseline gap-1.5 py-0.5 text-[11px] hover:underline">
                  <span className="font-mono text-[9px] text-neutral-400">{s.id.split(".")[1]}</span>
                  <span className="truncate">{s.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/** Color for a heatmap square given the active overlay. */
function heatStyle(t: TechCard, overlay: Overlay, groupSet: Set<string>): string {
  if (overlay === "mitigation") return t.hasMitigation ? "#10b981" : "#ef4444";
  if (overlay === "group") return groupSet.has(t.id) ? "#fbbf24" : "rgba(120,120,120,0.18)";
  // default: heat by number of groups observed
  if (t.groups <= 0) return "rgba(120,120,120,0.18)";
  const alpha = 0.25 + 0.75 * Math.min(t.groups / 20, 1);
  return `rgba(59,130,246,${alpha.toFixed(2)})`;
}

/** Tiny clickable square (Heatmap view). */
export function HeatCell({ t, overlay, groupSet }: { t: TechCard } & Omit<ViewProps, "columns" | "showSub">) {
  return (
    <Link
      href={hrefFor("technique", t.id)}
      title={`${t.id} ${t.name}${t.groups ? ` · ${t.groups} groups` : ""}`}
      className="block h-3.5 w-3.5 rounded-[3px] ring-1 ring-black/5 transition-transform hover:scale-125 hover:ring-black/30 dark:ring-white/10"
      style={{ background: heatStyle(t, overlay, groupSet) }}
    />
  );
}

/** Flatten a tactic's techniques (+ optional sub-techniques) for the heatmap. */
export function heatItems(tac: TacticColumn, showSub: boolean): TechCard[] {
  if (!showSub) return tac.techniques;
  return tac.techniques.flatMap((t) => [t, ...(t.subtechniques ?? [])]);
}
