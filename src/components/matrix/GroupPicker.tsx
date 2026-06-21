"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchIndex } from "@/lib/searchClient";

export function GroupPicker({
  selectedName,
  onPick,
}: {
  selectedName: string;
  onPick: (id: string, name: string) => void;
}) {
  const loaded = useSearchIndex();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    if (!loaded) return [];
    const all = loaded.docs.filter((d) => d.type === "group");
    const ql = q.trim().toLowerCase();
    const filtered = ql ? all.filter((g) => g.name.toLowerCase().includes(ql) || g.id.toLowerCase().includes(ql)) : all;
    return filtered.sort((a, b) => (b.techniques ?? 0) - (a.techniques ?? 0)).slice(0, 30);
  }, [loaded, q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={open ? q : selectedName || q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder="pick a group…"
        className="w-44 rounded-md border border-neutral-200 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
      />
      {open && groups.length > 0 && (
        <ul className="card absolute z-20 mt-1 max-h-64 w-64 overflow-y-auto p-1 shadow-xl">
          {groups.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => {
                  onPick(g.id, g.name);
                  setOpen(false);
                  setQ("");
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="font-mono text-[10px] text-neutral-400">{g.id}</span>
                <span className="truncate">{g.name}</span>
                <span className="ml-auto text-xs text-neutral-400">{g.techniques}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
