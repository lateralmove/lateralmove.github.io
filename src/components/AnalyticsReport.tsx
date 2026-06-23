"use client";

import Link from "next/link";
import { useSearchIndex } from "@/lib/searchClient";
import { reportBySlug } from "@/lib/reports";
import { plural } from "@/lib/plural";
import { RankedBars } from "./RankedBars";

export function AnalyticsReport({ slug }: { slug: string }) {
  const loaded = useSearchIndex();
  const report = reportBySlug(slug);

  if (!report)
    return (
      <div className="py-20 text-center text-neutral-400">
        Unknown report.{" "}
        <Link href="/analytics/" className="link">
          Back to analytics
        </Link>
      </div>
    );

  const items = loaded ? report.build(loaded.docs) : [];

  return (
    <div className="space-y-4">
      <Link href="/analytics/" className="link text-sm">
        ← Analytics
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{report.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{report.blurb} Full ranking below.</p>
      </div>
      {!loaded ? (
        <div className="py-20 text-center text-neutral-400">Loading…</div>
      ) : (
        <>
          <div className="text-sm text-neutral-400">{plural(items.length, "result")}</div>
          <div className="card p-4">
            <RankedBars items={items} unit={report.unit} showRank />
          </div>
          {report.note && <p className="text-xs text-neutral-400">* {report.note}</p>}
        </>
      )}
    </div>
  );
}
