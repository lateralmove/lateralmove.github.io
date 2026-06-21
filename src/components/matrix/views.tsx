"use client";

import { useState } from "react";
import type { TacticColumn } from "@/lib/types";
import { Cell, CompactRow, HeatCell, heatItems, type Overlay, type ViewProps } from "./cells";

const nonEmpty = (cols: TacticColumn[]) => cols.filter((t) => t.techniques.length > 0);

const TECH_GRID = "grid gap-2 grid-cols-[repeat(auto-fill,minmax(210px,1fr))]";

/* ---------------------------------------------------------------- Sections (default) */
export function SectionsView({ columns, overlay, groupSet, showSub }: ViewProps) {
  const cols = nonEmpty(columns);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-xs text-neutral-500">
        <button className="hover:underline" onClick={() => setCollapsed(new Set())}>
          Expand all
        </button>
        <button className="hover:underline" onClick={() => setCollapsed(new Set(cols.map((c) => c.id)))}>
          Collapse all
        </button>
      </div>
      {cols.map((tac) => {
        const isCollapsed = collapsed.has(tac.id);
        return (
          <section key={tac.id} className="card overflow-hidden">
            <button
              onClick={() => toggle(tac.id)}
              className="flex w-full items-center gap-2 bg-neutral-100 px-3 py-2 text-left dark:bg-neutral-800"
            >
              <span className="text-neutral-400">{isCollapsed ? "▸" : "▾"}</span>
              <span className="font-semibold">{tac.name}</span>
              <span className="text-xs text-neutral-400">{tac.techniques.length}</span>
            </button>
            {!isCollapsed && (
              <div className={`${TECH_GRID} p-3`}>
                {tac.techniques.map((t) => (
                  <Cell key={t.id} t={t} overlay={overlay} groupSet={groupSet} showSub={showSub} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Panels (masonry) */
export function PanelsView({ columns, overlay, groupSet, showSub }: ViewProps) {
  return (
    <div className="gap-2 [column-fill:_balance] columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
      {nonEmpty(columns).map((tac) => (
        <section key={tac.id} className="card mb-2 break-inside-avoid p-2">
          <div className="mb-1.5 flex items-baseline gap-2 border-b border-neutral-100 pb-1 dark:border-neutral-800">
            <span className="text-sm font-semibold">{tac.name}</span>
            <span className="text-[11px] text-neutral-400">{tac.techniques.length}</span>
          </div>
          <ul className="space-y-0.5">
            {tac.techniques.map((t) => (
              <CompactRow key={t.id} t={t} overlay={overlay} groupSet={groupSet} showSub={showSub} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Tabs + focused grid */
export function TabsView(props: ViewProps) {
  const cols = nonEmpty(props.columns);
  const [sel, setSel] = useState<string>(cols[0]?.id ?? "all");
  const current = cols.find((c) => c.id === sel);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Pill active={sel === "all"} onClick={() => setSel("all")}>
          All
        </Pill>
        {cols.map((tac) => (
          <Pill key={tac.id} active={sel === tac.id} onClick={() => setSel(tac.id)}>
            {tac.name} <span className="text-neutral-400">{tac.techniques.length}</span>
          </Pill>
        ))}
      </div>

      {sel === "all" || !current ? (
        <SectionsView {...props} />
      ) : (
        <div>
          <h2 className="mb-2 text-sm font-semibold">
            {current.name} <span className="text-neutral-400">— {current.techniques.length} techniques</span>
          </h2>
          <div className={TECH_GRID}>
            {current.techniques.map((t) => (
              <Cell key={t.id} t={t} overlay={props.overlay} groupSet={props.groupSet} showSub={props.showSub} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs " +
        (active
          ? "border-neutral-400 bg-neutral-200 font-medium dark:border-neutral-500 dark:bg-neutral-800"
          : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800")
      }
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Heatmap */
export function HeatmapView({ columns, overlay, groupSet, showSub }: ViewProps) {
  return (
    <div className="space-y-3">
      <HeatLegend overlay={overlay} />
      <div className="flex gap-1.5">
        {columns.map((tac) => {
          const items = heatItems(tac, showSub);
          return (
            <div key={tac.id} className="min-w-0 flex-1">
              <div className="mb-1.5 truncate text-[11px] font-medium text-neutral-500" title={`${tac.name} · ${items.length}`}>
                {tac.name}
              </div>
              <div className="flex flex-wrap gap-0.5">
                {items.map((t) => (
                  <HeatCell key={t.id} t={t} overlay={overlay} groupSet={groupSet} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeatLegend({ overlay }: { overlay: Overlay }) {
  const items: [string, string][] =
    overlay === "mitigation"
      ? [["has mitigation", "#10b981"], ["none", "#ef4444"]]
      : overlay === "group"
        ? [["used by group", "#fbbf24"], ["not used", "rgba(120,120,120,0.18)"]]
        : [["few groups", "rgba(59,130,246,0.25)"], ["many groups", "rgba(59,130,246,1)"], ["none", "rgba(120,120,120,0.18)"]];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px]" style={{ background: color }} />
          {label}
        </span>
      ))}
      <span className="ml-auto">hover a cell for its name · click to open</span>
    </div>
  );
}
