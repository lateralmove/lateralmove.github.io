// SEO helpers shared by route metadata (generateMetadata) and the sitemap/robots
// routes. No node/server-only imports, so it's safe to pull in from anywhere.
import type { Metadata } from "next";
import { hrefFor, TYPE_META } from "./entities";
import type { EntityType } from "./types";

/** Canonical production origin (also used as metadataBase in app/layout.tsx). */
export const SITE_URL = "https://lateralmove.github.io";

const SITE_NAME = "Lateral Move";

/** Resolve a relative path to an absolute URL against the canonical origin. */
const abs = (path: string) => new URL(path, SITE_URL).toString();

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

/**
 * schema.org `@type` per entity. TechArticle reads best for the "how it works"
 * pages (techniques, software, mitigations, detections); Article fits the more
 * narrative actor/operation pages (groups, campaigns).
 */
const ARTICLE_TYPE: Record<EntityType, string> = {
  technique: "TechArticle",
  software: "TechArticle",
  mitigation: "TechArticle",
  "data-component": "TechArticle",
  group: "Article",
  campaign: "Article",
};

/**
 * JSON-LD for an entity page: a BreadcrumbList (<Type> › [parent] › <entity>) plus an
 * Article node. Mirrors the on-page breadcrumb (which omits the "Matrix" home root,
 * since the header already links home). Emitted as a single @graph in a
 * <script type="application/ld+json"> so Google can render breadcrumb trails and
 * richer snippets for the ~1,900 pages.
 */
export function entityJsonLd(
  type: EntityType,
  e: { id: string; name: string; description?: string | null; url?: string | null },
  parent?: { id: string; name: string } | null,
) {
  const url = abs(hrefFor(type, e.id));
  const name = `${e.id} ${e.name}`;
  const description = metaDescription(e.description) || undefined;
  const crumbs: { name: string; item?: string }[] = [
    { name: TYPE_META[type].plural, item: abs(`/search/?type=${type}`) },
  ];
  if (parent) crumbs.push({ name: `${parent.id} ${parent.name}`, item: abs(hrefFor("technique", parent.id)) });
  crumbs.push({ name }); // current page — no `item`, per schema.org guidance
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          ...(c.item ? { item: c.item } : {}),
        })),
      },
      {
        "@type": ARTICLE_TYPE[type],
        headline: name,
        name,
        ...(description ? { description } : {}),
        url,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        ...(e.url ? { sameAs: e.url } : {}),
      },
    ],
  };
}

/**
 * Site-level JSON-LD for the home page: a WebSite node with a SearchAction (enables
 * the Google sitelinks search box → /search?q=…) and a Dataset node crediting the
 * underlying ATT&CK STIX bundle.
 */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search/?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Dataset",
        name: "MITRE ATT&CK Enterprise",
        description:
          "The MITRE ATT&CK Enterprise knowledge base of adversary tactics, techniques, groups, software, campaigns, mitigations, and detections, browsed as a relationship-first graph.",
        url: SITE_URL,
        creator: { "@type": "Organization", name: "The MITRE Corporation", url: "https://attack.mitre.org" },
        isBasedOn: "https://github.com/mitre-attack/attack-stix-data",
        license: "https://attack.mitre.org/resources/legal-and-branding/terms-of-use/",
      },
    ],
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
