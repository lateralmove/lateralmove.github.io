"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hrefFor, TYPE_META } from "@/lib/entities";
import { useSearchIndex, type IndexedDoc } from "@/lib/searchClient";

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const loaded = useSearchIndex();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The palette is mounted only while open (see SiteHeader), so its initial state is
  // already a clean reset; just move focus to the input once it mounts.
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(id);
  }, []);

  const results = useMemo<IndexedDoc[]>(() => {
    if (!loaded) return [];
    if (!q.trim()) return [];
    return loaded.index
      .search(q)
      .slice(0, 20)
      .map((r) => loaded.byKey.get(r.id))
      .filter((d): d is IndexedDoc => d !== undefined);
  }, [q, loaded]);

  const choose = (d: IndexedDoc) => {
    onClose();
    router.push(hrefFor(d.type, d.id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              choose(results[active]);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          // Opt out of mobile-keyboard autocorrect/autocapitalize, which mangles
          // technical search terms (e.g. "mimikatz" -> "Mimi katz").
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="search"
          placeholder="Search techniques, groups, software, mitigations…"
          className="w-full border-b border-neutral-200 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-neutral-400 dark:border-neutral-800"
        />
        <ul className="max-h-[50vh] overflow-y-auto p-1">
          {!loaded && <li className="px-3 py-6 text-center text-sm text-neutral-400">Loading…</li>}
          {loaded && q.trim() && results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-neutral-400">No matches.</li>
          )}
          {results.map((d, i) => (
            <li key={d.key}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(d)}
                className={
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm " +
                  (i === active ? "bg-neutral-100 dark:bg-neutral-800" : "")
                }
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_META[d.type].dot}`} />
                <span className="font-mono text-xs text-neutral-400">{d.id}</span>
                <span className="truncate">{d.name}</span>
                <span className="ml-auto shrink-0 text-xs text-neutral-400">{TYPE_META[d.type].label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-neutral-200 px-3 py-1.5 text-[11px] text-neutral-400 dark:border-neutral-800">
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </div>
  );
}
