import type { MetadataRoute } from "next";
import { getManifest, getMeta } from "@/lib/data";
import { ALL_TYPES, hrefFor } from "@/lib/entities";
import { RANK_REPORTS } from "@/lib/reports";
import { SITE_URL } from "@/lib/seo";

// Static export: emitted once at build time as out/sitemap.xml.
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [manifest, meta] = await Promise.all([getManifest(), getMeta()]);
  // Whole corpus is regenerated together from one STIX bundle, so one timestamp fits all.
  const lastModified = meta.generatedAt ?? new Date().toISOString();
  const abs = (path: string) => `${SITE_URL}${path}`;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: abs("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: abs("/search/"), lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: abs("/analytics/"), lastModified, changeFrequency: "monthly", priority: 0.7 },
  ];

  const reportRoutes: MetadataRoute.Sitemap = RANK_REPORTS.map((r) => ({
    url: abs(`/analytics/${r.slug}/`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const entityRoutes: MetadataRoute.Sitemap = ALL_TYPES.flatMap((type) =>
    (manifest[type] ?? []).map((id) => ({
      url: abs(hrefFor(type, id)),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );

  return [...staticRoutes, ...reportRoutes, ...entityRoutes];
}
