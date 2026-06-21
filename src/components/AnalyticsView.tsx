"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchIndex } from "@/lib/searchClient";
import { RANK_REPORTS } from "@/lib/reports";
import { RankedBars } from "./RankedBars";

export function AnalyticsView({ tacticOrder }: { tacticOrder: string[] }) {
  const loaded = useSearchIndex();

  const data = useMemo(() => {
    if (!loaded) return null;
    const order = new Map(tacticOrder.map((name, i) => [name, i]));
    const docs = loaded.docs;
    const techniques = docs.filter((d) => d.type === "technique");
    const total = techniques.length;
    const missingMit = techniques.filter((d) => d.hasMitigation === false).length;

    const gap = new Map<string, { total: number; missing: number }>();
    for (const t of techniques)
      for (const tac of t.tactics ?? []) {
        const e = gap.get(tac) ?? { total: 0, missing: 0 };
        e.total += 1;
        if (t.hasMitigation === false) e.missing += 1;
        gap.set(tac, e);
      }

    // Attack surface per platform: technique count, split by mitigation coverage.
    // (Detection is 100% in ATT&CK v19, so mitigation is the only meaningful split.)
    // A technique counts once under each platform it targets.
    const plat = new Map<string, { total: number; covered: number }>();
    for (const t of techniques)
      for (const p of t.platforms ?? []) {
        const e = plat.get(p) ?? { total: 0, covered: 0 };
        e.total += 1;
        if (t.hasMitigation) e.covered += 1;
        plat.set(p, e);
      }

    return {
      docs,
      total,
      missingMit,
      tacticGap: [...gap.entries()].sort(
        (a, b) => (order.get(a[0]) ?? Infinity) - (order.get(b[0]) ?? Infinity)
      ),
      platformSurface: [...plat.entries()].sort((a, b) => b[1].total - a[1].total),
    };
  }, [loaded, tacticOrder]);

  if (!data) return <div className="py-20 text-center text-neutral-400">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coverage Analytics</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Aggregate views the official site makes you compute by hand. Click any panel title for the
          full report. Enterprise domain.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Techniques" value={data.total} sub="incl. sub-techniques" />
        <StatCard
          label="Missing mitigation"
          value={data.missingMit}
          sub={`${Math.round((data.missingMit / data.total) * 100)}% of techniques`}
          tone="rose"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {RANK_REPORTS.map((r) => (
          <Panel key={r.slug} title={r.title} href={`/analytics/${r.slug}/`}>
            <RankedBars items={r.build(data.docs)} limit={10} unit={r.unit} />
          </Panel>
        ))}

        <Panel title="Mitigation gap by tactic">
          <ul className="space-y-1.5 text-sm">
            {data.tacticGap.map(([tac, g], idx) => (
              <li key={tac} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-neutral-600 dark:text-neutral-300">
                  <span className="mr-1 tabular-nums text-neutral-400">{idx + 1}.</span>
                  {tac}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-full bg-rose-500" style={{ width: `${(g.missing / g.total) * 100}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-neutral-400">
                  {g.missing}/{g.total}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Attack surface by platform">
          <div className="mb-2 flex items-center gap-3 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> Has mitigation
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-rose-500" /> No mitigation
            </span>
          </div>
          <ul className="space-y-1.5 text-sm">
            {data.platformSurface.map(([p, s]) => {
              const maxTotal = data.platformSurface[0]?.[1].total ?? 1;
              return (
                <li key={p} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-neutral-600 dark:text-neutral-300">{p}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-full bg-emerald-500" style={{ width: `${(s.covered / maxTotal) * 100}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${((s.total - s.covered) / maxTotal) * 100}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs text-neutral-400">{s.total}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: "rose" | "emerald" }) {
  const color = tone === "rose" ? "text-rose-600 dark:text-rose-400" : tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "";
  return (
    <div className="card p-4">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="mt-1 text-sm font-medium">{label}</div>
      {sub && <div className="text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        {href ? (
          <Link href={href} className="text-sm font-semibold hover:underline">
            {title}
          </Link>
        ) : (
          <h2 className="text-sm font-semibold">{title}</h2>
        )}
        {href && (
          <Link href={href} className="link shrink-0 text-xs">
            View all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
