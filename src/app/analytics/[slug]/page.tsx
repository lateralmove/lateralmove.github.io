import type { Metadata } from "next";
import { AnalyticsReport } from "@/components/AnalyticsReport";
import { RANK_REPORTS, reportBySlug } from "@/lib/reports";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;
export const generateStaticParams = () => RANK_REPORTS.map((r) => ({ slug: r.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = reportBySlug(slug);
  return pageMetadata({
    title: r?.title ?? "Report",
    description: r?.blurb,
    path: `/analytics/${slug}/`,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AnalyticsReport slug={slug} />;
}
