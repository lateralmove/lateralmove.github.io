"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MatrixData, TechCard } from "@/lib/types";
import type { Overlay } from "./cells";
import { GroupPicker } from "./GroupPicker";
import { SectionsView, PanelsView, TabsView, HeatmapView } from "./views";

type View = "sections" | "panels" | "tabs" | "heatmap";

const VIEWS: { key: View; label: string }[] = [
  { key: "sections", label: "Sections" },
  { key: "panels", label: "Panels" },
  { key: "tabs", label: "Tabs" },
  { key: "heatmap", label: "Heatmap" },
];

const VIEW_KEY = "better-attack:matrix-view";

export function MatrixView({ initialData }: { initialData: MatrixData }) {
  // Rendered server-side and passed in, so the first paint already contains the
  // full grid (good for crawlers + perceived speed) instead of fetching after mount.
  const data = initialData;
  const [platform, setPlatform] = useState("all");
  const [query, setQuery] = useState("");
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [showSub, setShowSub] = useState(true);
  // Start on "sections" so the SSR and first client render match; restore the saved
  // preference after mount (reading localStorage during render would mismatch).
  const [view, setView] = useState<View>("sections");
  const filterRef = useRef<HTMLInputElement>(null);

  // group overlay
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [groupSet, setGroupSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY) as View | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore client-only preference after mount to match SSR
      if (saved && VIEWS.some((v) => v.key === saved)) setView(saved);
    } catch {}
  }, []);

  // Focus the filter field on load so users can type immediately.
  useEffect(() => {
    filterRef.current?.focus();
  }, []);

  const chooseView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const platforms = useMemo(() => {
    const s = new Set<string>();
    for (const t of data.tactics) for (const tech of t.techniques) tech.platforms.forEach((p) => s.add(p));
    return [...s].sort();
  }, [data]);

  const selectGroup = async (id: string, name: string) => {
    setGroupId(id);
    setGroupName(name);
    setOverlay("group");
    const res = await fetch(`/data/entities/groups/${id}.json`);
    const g = await res.json();
    setGroupSet(new Set((g.relationships.usesTechniques ?? []).map((r: { id: string }) => r.id)));
  };

  const q = query.trim().toLowerCase();
  const { columns, shown, total } = useMemo(() => {
    const matchTech = (t: TechCard) =>
      (platform === "all" || t.platforms.includes(platform)) &&
      (q === "" || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    // Count UNIQUE techniques by id: a technique mapped to several tactics
    // appears in multiple columns but is tallied once, so these match the
    // unique-technique count in the page header.
    const totalIds = new Set<string>();
    const shownIds = new Set<string>();
    const columns = data.tactics.map((tac) => {
      const techniques = tac.techniques
        .map((t) => {
          const allSubs = t.subtechniques ?? [];
          const subs = allSubs.filter(matchTech);
          const self = matchTech(t);
          // Top-level always counts; sub-techniques only when shown.
          totalIds.add(t.id);
          if (self) shownIds.add(t.id);
          if (showSub) {
            for (const s of allSubs) totalIds.add(s.id);
            for (const s of subs) shownIds.add(s.id);
          }
          if (!self && subs.length === 0) return null;
          return { ...t, subtechniques: subs };
        })
        .filter(Boolean) as TechCard[];
      return { ...tac, techniques };
    });
    return { columns, shown: shownIds.size, total: totalIds.size };
  }, [data, platform, q, showSub]);

  const viewProps = { columns, overlay, groupSet, showSub };

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="card space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={filterRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter techniques…"
            className="w-48 rounded-md border border-neutral-200 bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
          >
            <option value="all">All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
            <input type="checkbox" checked={showSub} onChange={(e) => setShowSub(e.target.checked)} />
            sub-techniques
          </label>

          {/* view switcher (wraps to its own line on narrow screens) */}
          <div className="flex shrink-0 overflow-x-auto rounded-md border border-neutral-200 sm:ml-auto dark:border-neutral-700">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => chooseView(v.key)}
                className={
                  "shrink-0 px-2.5 py-1.5 text-xs " +
                  (view === v.key
                    ? "bg-neutral-200 font-medium dark:bg-neutral-700"
                    : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800")
                }
              >
                {v.label}
              </button>
            ))}
          </div>
          <span className="text-sm text-neutral-400" title="Unique techniques shown / total (sub-techniques included when enabled), deduplicated across tactics.">
            {shown} / {total}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-neutral-500">Overlay:</span>
          {(["none", "mitigation", "group"] as Overlay[]).map((o) => (
            <label key={o} className="flex items-center gap-1.5">
              <input type="radio" name="overlay" checked={overlay === o} onChange={() => setOverlay(o)} />
              {o === "none" ? "None" : o === "mitigation" ? "Mitigation coverage" : "Group usage"}
            </label>
          ))}
          {overlay === "group" && <GroupPicker selectedName={groupName} onPick={selectGroup} />}
          {overlay === "mitigation" && (
            <span className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> has mitigation
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> no mitigation
              </span>
            </span>
          )}
          {overlay === "group" && groupId && (
            <span className="text-xs text-neutral-400">
              {[...groupSet].length} techniques attributed to {groupName}
            </span>
          )}
        </div>
      </div>

      {/* selected view */}
      {view === "sections" && <SectionsView {...viewProps} />}
      {view === "panels" && <PanelsView {...viewProps} />}
      {view === "tabs" && <TabsView {...viewProps} />}
      {view === "heatmap" && <HeatmapView {...viewProps} />}
    </div>
  );
}
