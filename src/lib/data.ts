// Server-only data loaders. Reads the prebuilt JSON shards from public/data at
// build time (static generation). Do not import from client components.
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { TYPE_META } from "./entities";
import type {
  Entity,
  EntityType,
  Manifest,
  MatrixData,
  Meta,
  SearchDoc,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(rel: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DATA_DIR, rel), "utf8")) as T;
}

export const getMeta = () => readJson<Meta>("meta.json");
export const getManifest = () => readJson<Manifest>("manifest.json");
export const getMatrix = () => readJson<MatrixData>("matrix.json");
export const getSearchDocs = () => readJson<SearchDoc[]>("search.json");

export async function getEntity<T extends Entity = Entity>(
  type: EntityType,
  id: string
): Promise<T> {
  return readJson<T>(`entities/${TYPE_META[type].route}/${id}.json`);
}

/** [{ id }] params for generateStaticParams. */
export async function getStaticIds(type: EntityType): Promise<{ id: string }[]> {
  const manifest = await getManifest();
  return (manifest[type] ?? []).map((id) => ({ id }));
}
