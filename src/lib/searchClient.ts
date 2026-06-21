"use client";

import { useEffect, useState } from "react";
import MiniSearch from "minisearch";
import type { SearchDoc } from "./types";
import { ALL_TYPES } from "./entities";

export interface IndexedDoc extends SearchDoc {
  key: string;
}

interface Loaded {
  docs: IndexedDoc[];
  index: MiniSearch<IndexedDoc>;
}

let cache: Loaded | null = null;
let inflight: Promise<Loaded> | null = null;

async function load(): Promise<Loaded> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const res = await fetch("/data/search.json");
    const raw = (await res.json()) as SearchDoc[];
    // Browse mode (empty query) renders `docs` as-is, so give it a stable order:
    // grouped by type (ALL_TYPES order), then alphabetical by name within a type.
    // Doesn't affect query results, which MiniSearch ranks by relevance.
    const typeOrder = new Map(ALL_TYPES.map((t, i) => [t, i]));
    const docs: IndexedDoc[] = raw
      .map((d) => ({ ...d, key: `${d.type}:${d.id}` }))
      .sort(
        (a, b) =>
          (typeOrder.get(a.type) ?? 0) - (typeOrder.get(b.type) ?? 0) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    const index = new MiniSearch<IndexedDoc>({
      idField: "key",
      fields: ["name", "id", "desc", "tactics", "platforms"],
      storeFields: [
        "id",
        "type",
        "name",
        "desc",
        "sub",
        "tactics",
        "platforms",
        "groups",
        "techniques",
        "software",
        "campaigns",
        "kind",
        "hasMitigation",
        "hasDetection",
        "firstSeen",
        "lastSeen",
      ],
      searchOptions: { prefix: true, fuzzy: 0.15, boost: { name: 3, id: 3 } },
    });
    index.addAll(docs);
    cache = { docs, index };
    return cache;
  })();
  return inflight;
}

/** Loads the search corpus + MiniSearch index once, shared across components. */
export function useSearchIndex() {
  const [loaded, setLoaded] = useState<Loaded | null>(cache);
  useEffect(() => {
    let alive = true;
    load().then((l) => alive && setLoaded(l));
    return () => {
      alive = false;
    };
  }, []);
  return loaded;
}
