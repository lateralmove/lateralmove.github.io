"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { hrefFor, TYPE_META, ALL_TYPES } from "@/lib/entities";
import { useSearchIndex, type IndexedDoc } from "@/lib/searchClient";
import { plural } from "@/lib/plural";
import type { EntityType } from "@/lib/types";

/** Everything the URL round-trips, so a search is shareable / bookmarkable. */
interface SearchState {
  q: string;
  types: Set<EntityType>;
  platforms: Set<string>;
  tactics: Set<string>;
  missingMit: boolean;
}

type ParamsLike = { get: (key: string) => string | null };

const readCsv = (params: ParamsLike, key: string): Set<string> =>
  new Set((params.get(key) ?? "").split(",").map((s) => s.trim()).filter(Boolean));

function parseParams(params: ParamsLike): SearchState {
  const types = new Set(
    [...readCsv(params, "type")].filter((t): t is EntityType => ALL_TYPES.includes(t as EntityType)),
  );
  return {
    q: params.get("q") ?? "",
    types,
    platforms: readCsv(params, "platform"),
    tactics: readCsv(params, "tactic"),
    missingMit: params.get("missing") === "1",
  };
}

/** Canonical query string for a state — values sorted so two equal states always
 *  serialize identically (used to break the state⇄URL sync loop). */
function toQS(s: SearchState): string {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q);
  const add = (key: string, set: Set<string>) => {
    const vals = [...set].sort();
    if (vals.length) p.set(key, vals.join(","));
  };
  add("type", s.types as Set<string>);
  add("platform", s.platforms);
  add("tactic", s.tactics);
  if (s.missingMit) p.set("missing", "1");
  return p.toString();
}

export function SearchView() {
  const loaded = useSearchIndex();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from the URL so a shared link (?q=…&type=…&platform=…) restores state.
  const [boot] = useState(() => parseParams(params));
  const [query, setQuery] = useState(boot.q);
  const [types, setTypes] = useState<Set<EntityType>>(boot.types);
  const [platforms, setPlatforms] = useState<Set<string>>(boot.platforms);
  const [tactics, setTactics] = useState<Set<string>>(boot.tactics);
  const [missingMit, setMissingMit] = useState(boot.missingMit);
  const [limit, setLimit] = useState(60);
  const [active, setActive] = useState(-1); // keyboard-highlighted result row
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile: facets collapsed by default so results show first

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const focusSearchOnDesktop = useCallback(() => {
    if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
  }, []);

  // Adopt external navigation (e.g. the nav "Groups"/"Software" links, or back/forward)
  // that changes the URL. Guarded by canonical comparison so our own writes don't loop.
  useEffect(() => {
    const fromUrl = parseParams(params);
    const current: SearchState = { q: query, types, platforms, tactics, missingMit };
    if (toQS(fromUrl) === toQS(current)) return;
    /* eslint-disable react-hooks/set-state-in-effect -- adopt external URL changes; guarded above so it can't loop */
    setQuery(fromUrl.q);
    setTypes(fromUrl.types);
    setPlatforms(fromUrl.platforms);
    setTactics(fromUrl.tactics);
    setMissingMit(fromUrl.missingMit);
    /* eslint-enable react-hooks/set-state-in-effect */
    focusSearchOnDesktop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to URL changes; including state would loop
  }, [params]);

  // Reflect state back into the URL (replace, so typing doesn't spam history).
  useEffect(() => {
    const qs = toQS({ q: query, types, platforms, tactics, missingMit });
    if (qs === toQS(parseParams(params))) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- write on state change only
  }, [query, types, platforms, tactics, missingMit]);

  // Keep the cursor in the search box once the index is ready (desktop only — on
  // mobile, popping the keyboard covers the results with no room to scroll past it).
  useEffect(() => {
    if (loaded) focusSearchOnDesktop();
  }, [loaded, focusSearchOnDesktop]);

  const base = useMemo<IndexedDoc[]>(() => {
    if (!loaded) return [];
    if (!query.trim()) return loaded.docs;
    return loaded.index
      .search(query)
      .map((r) => loaded.byKey.get(r.id))
      .filter((d): d is IndexedDoc => d !== undefined);
  }, [loaded, query]);

  // A doc passes the active filters. Pass `ignore` to skip one dimension so a
  // facet's counts reflect the OTHER selected facets (responsive faceting).
  const passes = useCallback(
    (d: IndexedDoc, ignore?: "type" | "platform" | "tactic" | "coverage") => {
      if (ignore !== "type" && types.size && !types.has(d.type)) return false;
      if (ignore !== "platform" && platforms.size && !(d.platforms ?? []).some((p) => platforms.has(p))) return false;
      if (ignore !== "tactic" && tactics.size && !(d.tactics ?? []).some((t) => tactics.has(t))) return false;
      if (ignore !== "coverage" && missingMit && !(d.type === "technique" && d.hasMitigation === false)) return false;
      return true;
    },
    [types, platforms, tactics, missingMit],
  );

  const results = useMemo(() => {
    const filtered = base.filter((d) => passes(d));
    // Campaign listing defaults to most-recent-first.
    if (filtered.length > 0 && filtered.every((d) => d.type === "campaign")) {
      return [...filtered].sort((a, b) =>
        (b.lastSeen ?? b.firstSeen ?? "").localeCompare(a.lastSeen ?? a.firstSeen ?? "")
      );
    }
    return filtered;
  }, [base, passes]);

  const visible = useMemo(() => results.slice(0, limit), [results, limit]);

  // Reset pagination + keyboard cursor whenever the result set changes.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on query/filter change */
    setLimit(60);
    setActive(-1);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [query, types, platforms, tactics, missingMit]);

  // Scroll the keyboard-highlighted row into view.
  useEffect(() => {
    if (active < 0) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      const d = visible[active];
      if (d) {
        e.preventDefault();
        router.push(hrefFor(d.type, d.id));
      }
    } else if (e.key === "Escape") {
      if (active >= 0) setActive(-1);
      else if (query) setQuery("");
    }
  };

  // Rank tactics by the canonical kill-chain order (from meta.json) so the facet
  // reads top-to-bottom like the matrix, not alphabetically. Unknowns sort last.
  const tacticRank = useMemo(() => {
    const order = new Map((loaded?.tacticOrder ?? []).map((name, i) => [name, i]));
    return (name: string) => order.get(name) ?? Number.MAX_SAFE_INTEGER;
  }, [loaded]);

  // Cross-filtered facet options: each facet counts the set filtered by the OTHER
  // facets, and only keeps options that would still yield results (or are already
  // selected). This makes any selection that produces 0 results impossible to pick.
  const facets = useMemo(() => {
    const typeCount = new Map<EntityType, number>();
    const platCount = new Map<string, number>();
    const tacCount = new Map<string, number>();
    let missing = 0;
    for (const d of base) {
      if (passes(d, "type")) typeCount.set(d.type, (typeCount.get(d.type) ?? 0) + 1);
      if (passes(d, "platform")) (d.platforms ?? []).forEach((p) => platCount.set(p, (platCount.get(p) ?? 0) + 1));
      if (passes(d, "tactic")) (d.tactics ?? []).forEach((t) => tacCount.set(t, (tacCount.get(t) ?? 0) + 1));
      if (passes(d, "coverage") && d.type === "technique" && d.hasMitigation === false) missing += 1;
    }
    return {
      types: ALL_TYPES.map((t) => [t, typeCount.get(t) ?? 0] as const).filter(([t, n]) => n > 0 || types.has(t)),
      platforms: [...platCount.entries()].sort((a, b) => b[1] - a[1]).filter(([p, n]) => n > 0 || platforms.has(p)),
      tactics: [...tacCount.entries()]
        .sort((a, b) => tacticRank(a[0]) - tacticRank(b[0]) || a[0].localeCompare(b[0]))
        .filter(([t, n]) => n > 0 || tactics.has(t)),
      missing,
    };
  }, [base, passes, types, platforms, tactics, tacticRank]);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
    focusSearchOnDesktop();
  };

  const activeCount = types.size + platforms.size + tactics.size + (missingMit ? 1 : 0);
  const clearAll = () => {
    setTypes(new Set());
    setPlatforms(new Set());
    setTactics(new Set());
    setMissingMit(false);
  };

  if (!loaded) return <div className="py-20 text-center text-neutral-400">Loading search…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          // Mobile keyboards (GBoard) autocorrect technical terms — "mimikatz" -> "Mimi katz",
          // "T1059" -> "T 1059" — which wrecks results. Opt out of all keyboard "assistance".
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="search"
          placeholder="Search across all ATT&CK objects…"
          role="combobox"
          aria-expanded={visible.length > 0}
          aria-controls="search-results"
          aria-activedescendant={active >= 0 ? `result-${active}` : undefined}
          aria-label="Search across all ATT&CK objects"
          className="w-full rounded-lg border border-neutral-200 bg-transparent px-4 py-3 pr-11 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            title="Clear search"
            className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        {/* facets — collapsed by default on mobile (where they'd otherwise push results down); always shown on md+ */}
        <aside className="text-sm">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="flex w-full items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 md:hidden dark:border-neutral-700"
          >
            <span className="text-neutral-400">{filtersOpen ? "▾" : "▸"}</span>
            <span className="font-medium">Filters</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-neutral-200 px-1.5 text-xs dark:bg-neutral-700">{activeCount}</span>
            )}
          </button>
          <div className={`space-y-5 ${filtersOpen ? "mt-3 " : "hidden "}md:mt-0 md:block`}>
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Filters{activeCount > 0 ? ` · ${activeCount}` : ""}
            </span>
            <button
              onClick={clearAll}
              disabled={activeCount === 0}
              className="text-xs font-medium link disabled:cursor-default disabled:text-neutral-300 disabled:no-underline disabled:hover:no-underline dark:disabled:text-neutral-600"
            >
              Clear filters
            </button>
          </div>

          {facets.types.length > 0 && (
            <Facet title="Type">
              {facets.types.map(([t, n]) => (
                <Check key={t} checked={types.has(t)} onChange={() => toggle(types, t, setTypes)} label={TYPE_META[t].plural} count={n} dot={TYPE_META[t].dot} />
              ))}
            </Facet>
          )}

          {(facets.missing > 0 || missingMit) && (
            <Facet title="Coverage">
              <Check checked={missingMit} onChange={() => { setMissingMit((v) => !v); focusSearchOnDesktop(); }} label="Missing mitigation" count={facets.missing} />
            </Facet>
          )}

          {facets.tactics.length > 0 && (
            <Facet title="Tactic">
              {facets.tactics.map(([t, n]) => (
                <Check key={t} checked={tactics.has(t)} onChange={() => toggle(tactics, t, setTactics)} label={t} count={n} />
              ))}
            </Facet>
          )}

          {facets.platforms.length > 0 && (
            <Facet title="Platform">
              {facets.platforms.map(([p, n]) => (
                <Check key={p} checked={platforms.has(p)} onChange={() => toggle(platforms, p, setPlatforms)} label={p} count={n} />
              ))}
            </Facet>
          )}
          </div>
        </aside>

        {/* results */}
        <div>
          <div className="mb-2 text-sm text-neutral-400">{plural(results.length, "result")}</div>
          <ul id="search-results" role="listbox" aria-label="Search results" ref={listRef} className="space-y-2">
            {visible.map((d, i) => (
              <li key={`${d.type}:${d.id}`}>
                <Link
                  id={`result-${i}`}
                  role="option"
                  aria-selected={i === active}
                  href={hrefFor(d.type, d.id)}
                  onMouseEnter={() => setActive(i)}
                  className={`card block p-3 hover:border-neutral-300 dark:hover:border-neutral-600 ${
                    i === active ? "border-neutral-400 ring-2 ring-neutral-300 dark:border-neutral-500 dark:ring-neutral-600" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${TYPE_META[d.type].dot}`} />
                    <span className="font-mono text-xs text-neutral-400">{d.id}</span>
                    <span className="font-medium">{d.name}</span>
                    {d.sub && <span className="text-xs text-neutral-400">(sub-technique)</span>}
                    <span className="ml-auto text-xs text-neutral-400">{TYPE_META[d.type].label}</span>
                  </div>
                  {d.desc && <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{d.desc}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                    {(d.tactics ?? []).map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                    {typeof d.groups === "number" && d.groups > 0 && <span>{plural(d.groups, "group")}</span>}
                    {typeof d.techniques === "number" && <span>{plural(d.techniques, "technique")}</span>}
                    {d.type === "technique" && (
                      <span className={d.hasMitigation ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {d.hasMitigation ? "✓ mitigation" : "✗ no mitigation"}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {results.length > limit && (
            <button onClick={() => setLimit((l) => l + 100)} className="mt-4 text-sm font-medium link">
              Show more ({results.length - limit} remaining)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
  count,
  dot,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs text-neutral-400">{count}</span>
    </label>
  );
}
