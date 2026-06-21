"use client";

import Link from "next/link";
import { hrefFor } from "@/lib/entities";
import type { RankItem } from "@/lib/reports";

/** Horizontal bar ranking of entities, each linking to its page. The metric unit
 *  is shown once as a column header so per-row values stay a single number. */
export function RankedBars({
  items,
  limit,
  unit,
  showRank = false,
}: {
  items: RankItem[];
  limit?: number;
  unit?: string;
  showRank?: boolean;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  const max = Math.max(1, ...shown.map((i) => i.value));
  if (shown.length === 0) return <p className="text-sm text-neutral-400">No data.</p>;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {showRank && <span className="w-6 shrink-0" />}
        <span className="w-48 shrink-0" />
        <span className="flex-1" />
        <span className="w-16 shrink-0 text-right">{unit ?? "count"}</span>
      </div>
      <ol className="space-y-1.5 text-sm">
        {shown.map((i, idx) => (
          <li key={`${i.type}:${i.id}`} className="flex items-center gap-2">
            {showRank && <span className="w-6 shrink-0 text-right text-xs text-neutral-400">{idx + 1}</span>}
            <Link href={hrefFor(i.type, i.id)} className="w-48 shrink-0 truncate hover:underline" title={i.name}>
              <span className="font-mono text-[10px] text-neutral-400">{i.id}</span> {i.name}
            </Link>
            <div className="h-3 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full bg-sky-500" style={{ width: `${(i.value / max) * 100}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-xs tabular-nums text-neutral-500">{i.display ?? i.value}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
