"use client";

import { useState } from "react";
import type { Ref } from "@/lib/types";
import { EntityLink } from "./EntityLink";
import { Markdown } from "./Markdown";

/**
 * A titled, collapsible list of related entities. The heart of the
 * "relationship-first" UI: every edge is a one-click pivot to its target.
 */
export function RelationshipSection({
  title,
  hint,
  items,
  initial = 12,
  describe = false,
  accent,
}: {
  title: string;
  hint?: string;
  items: Ref[];
  initial?: number;
  /** Render each item full-width with its edge description (e.g. mitigation guidance). */
  describe?: boolean;
  /** Optional left-border accent classes, e.g. "border-l-2 border-l-emerald-500". */
  accent?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, initial);

  return (
    <section className={`card p-4${accent ? ` ${accent}` : ""}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {title}{" "}
          <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {items.length}
          </span>
        </h3>
        {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">None recorded in ATT&CK.</p>
      ) : describe ? (
        <ul className="space-y-3">
          {shown.map((it) => (
            <li key={`${it.type}-${it.id}`} className="text-sm">
              <EntityLink item={it} />
              {it.description && (
                <Markdown className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                  {it.description}
                </Markdown>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {shown.map((it) => (
            <li key={`${it.type}-${it.id}`} className="truncate text-sm">
              <EntityLink item={it} />
            </li>
          ))}
        </ul>
      )}
      {items.length > initial && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-medium link"
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
