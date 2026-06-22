// Shared MiniSearch configuration + doc shaping, imported by BOTH the build-time
// indexer (scripts/build-data.mjs, run under node) and the client loader
// (src/lib/searchClient.ts). These MUST stay identical: MiniSearch.loadJSON()
// rejects an index that was serialized with different options, and browse-mode
// ordering depends on the sort below.

/**
 * MiniSearch options. Deliberately no `storeFields`: a search result then carries
 * only its `key` (the idField), which the client maps back to the full doc via a
 * lookup table. That keeps the serialized index roughly half the size on the wire.
 * @type {import('minisearch').Options}
 */
export const MINISEARCH_OPTIONS = {
  idField: "key",
  fields: ["name", "id", "desc", "tactics", "platforms"],
  searchOptions: { prefix: true, fuzzy: 0.15, boost: { name: 3, id: 3 } },
};

// Browse-mode (empty query) grouping order. Mirrors the TYPE_META key order in
// entities.ts — keep in sync if the canonical entity-type order ever changes.
const TYPE_ORDER = ["technique", "group", "software", "campaign", "mitigation", "data-component"];

/**
 * Raw search docs -> indexed docs: add a stable `key` and apply the browse order
 * (grouped by type in TYPE_ORDER, then alphabetical by name). Query results are
 * ranked by MiniSearch and unaffected by this sort.
 * @param {import('./types').SearchDoc[]} raw
 * @returns {(import('./types').SearchDoc & { key: string })[]}
 */
export function toIndexedDocs(raw) {
  const order = new Map(TYPE_ORDER.map((t, i) => [t, i]));
  return raw
    .map((d) => ({ ...d, key: `${d.type}:${d.id}` }))
    .sort(
      (a, b) =>
        (order.get(a.type) ?? 0) - (order.get(b.type) ?? 0) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}
