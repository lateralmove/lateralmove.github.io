import { MatrixView } from "@/components/matrix";
import { getMatrix, getMeta } from "@/lib/data";
import { siteJsonLd } from "@/lib/seo";

export default async function Home() {
  const [meta, matrix] = await Promise.all([getMeta(), getMatrix()]);
  const c = meta.counts;
  return (
    <div className="space-y-5">
      {/* Site-level structured data: WebSite + SearchAction (sitelinks search box) + Dataset credit. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xs font-medium tracking-wide text-neutral-400">
            A faster way to browse Enterprise MITRE ATT&amp;CK{meta.version ? ` v${meta.version}` : ""} (latest)
          </h1>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
          {[
            ["techniques", c.technique],
            ["groups", c.group],
            ["software", c.software],
            ["campaigns", c.campaign],
            ["mitigations", c.mitigation],
            ["data components", c["data-component"]],
          ].map(([label, n]) => (
            <span key={label as string} className="rounded-md bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">{n}</span> {label}
            </span>
          ))}
        </div>
      </div>
      <MatrixView initialData={matrix} />
    </div>
  );
}
