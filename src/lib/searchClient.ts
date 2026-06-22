"use client";

import { useEffect, useState } from "react";
import MiniSearch from "minisearch";
import type { SearchDoc } from "./types";
import { MINISEARCH_OPTIONS, toIndexedDocs } from "./searchConfig.mjs";

export interface IndexedDoc extends SearchDoc {
  key: string;
}

interface Loaded {
  docs: IndexedDoc[];
  index: MiniSearch<IndexedDoc>;
  /** key (`type:id`) -> doc. Search results carry only their key; hydrate via this. */
  byKey: Map<string, IndexedDoc>;
}

let cache: Loaded | null = null;
let inflight: Promise<Loaded> | null = null;

async function load(): Promise<Loaded> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    // The browse docs and the pre-serialized index load in parallel. The index is
    // built at build time (scripts/build-data.mjs) and rehydrated here via
    // loadJSON, which skips re-tokenizing the ~1,900-doc corpus — the heaviest part
    // of building the index, previously paid on the main thread on first search.
    const [raw, indexText] = await Promise.all([
      fetch("/data/search.json").then((r) => r.json() as Promise<SearchDoc[]>),
      fetch("/data/search-index.json").then((r) => r.text()),
    ]);
    const docs = toIndexedDocs(raw);
    const index = MiniSearch.loadJSON<IndexedDoc>(indexText, MINISEARCH_OPTIONS);
    const byKey = new Map(docs.map((d) => [d.key, d]));
    cache = { docs, index, byKey };
    return cache;
  })();
  return inflight;
}

/** Loads the search corpus + pre-serialized MiniSearch index once, shared across components. */
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
