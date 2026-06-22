// SEO helpers shared by route metadata (generateMetadata) and the sitemap/robots
// routes. No node/server-only imports, so it's safe to pull in from anywhere.
import type { Metadata } from "next";
import { hrefFor } from "./entities";
import type { EntityType } from "./types";

/** Canonical production origin (also used as metadataBase in app/layout.tsx). */
export const SITE_URL = "https://lateralmove.github.io";

const SITE_NAME = "Lateral Move";

// app/opengraph-image.png is auto-attached to routes that DON'T set their own
// `openGraph`. These helpers do, and metadata is *shallow*-merged, so the inherited
// file-based image would be dropped — we re-attach it explicitly. URL resolves
// against metadataBase; alt mirrors app/opengraph-image.alt.txt.
const OG_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "Lateral Move — a relationship-first MITRE ATT&CK Enterprise explorer",
};

/**
 * Collapse cleaned-markdown entity prose into a single-line, length-capped plain
 * string for <meta name="description"> / og:description. Cuts on a word boundary
 * so previews don't end mid-word. ~160 chars is the search-snippet sweet spot.
 */
export function metaDescription(text: string | null | undefined, max = 160): string {
  const s = (text ?? "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [label](url) -> label
    .replace(/[`*_#>]+/g, "") // strip md emphasis / heading / code markers
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "").trimEnd() + "…";
}

/**
 * Per-entity Metadata: a distinct title + description + canonical URL so each of
 * the ~1,900 entity pages gets its own search/social snippet instead of inheriting
 * the site-wide one. The OG/Twitter image still comes from the root opengraph-image
 * file (file-based metadata wins over generateMetadata, so it's applied on top).
 */
export function entityMetadata(
  type: EntityType,
  e: { id: string; name: string; description?: string | null },
): Metadata {
  const title = `${e.id} ${e.name} · ${SITE_NAME}`;
  const description = metaDescription(e.description) || undefined;
  const url = hrefFor(type, e.id); // relative; resolved against metadataBase
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", siteName: SITE_NAME, url, title, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}

/** Metadata for a non-entity content page (e.g. an analytics report). */
export function pageMetadata(opts: { title: string; description?: string; path: string }): Metadata {
  const title = `${opts.title} · ${SITE_NAME}`;
  const { description, path } = opts;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, url: path, title, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE] },
  };
}
