import type { Metadata } from "next";
import { getMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

const REPO = "https://github.com/lateralmove/lateralmove.github.io";
const NEW_ISSUE = "https://github.com/lateralmove/lateralmove.github.io/issues/new";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "An independent, faster, relationship-first explorer for the MITRE ATT&CK Enterprise knowledge base, built by one person and fully open source.",
  path: "/about/",
});

export default async function AboutPage() {
  const meta = await getMeta();
  const c = meta.counts;
  const entityPages = Object.values(c).reduce((a, b) => a + b, 0);
  // Link to the exact versioned STIX file matching the bundle this build was made from.
  const stixJson = meta.version
    ? `https://github.com/mitre-attack/attack-stix-data/blob/master/enterprise-attack/enterprise-attack-${meta.version}.json`
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">About</h1>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <strong>Lateral Move</strong> is an independent, faster way to explore the{" "}
          <span className="whitespace-nowrap">MITRE ATT&amp;CK®</span> Enterprise knowledge base.
        </p>
      </header>

      <section className="space-y-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        <p>
          I have a lot of respect for MITRE and the ATT&amp;CK project. It&apos;s a remarkable, freely
          shared body of work that much of the security community leans on every day. The official
          site, though, can feel a little dated and slow to move around: ATT&amp;CK is a richly
          connected graph, but you mostly browse it as long pages of one-way links.
        </p>
        <p>
          This is an attempt at a fast, easy-to-search browsing experience, built on a modern tech
          stack. It covers the <strong>Enterprise</strong>{" "}
          domain only. If that&apos;s all you need,
          this should be a quicker, lighter place to work.
        </p>
      </section>

      <section className="card space-y-3 p-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Vibe coded by one person (and Claude) <span aria-label="Switzerland" title="Switzerland">🇨🇭</span>
        </h2>
        <p>It&apos;s a solo side project, made in Switzerland (not affiliated with The MITRE Corporation).</p>
        <p>
          It&apos;s fully open source. The code and the data pipeline are all on{" "}
          <a className="link" href={REPO} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
        </p>
        <p>
          Feedback, ideas and bug reports are more than welcome:{" "}
          <a className="link" href={NEW_ISSUE} target="_blank" rel="noopener noreferrer">
            open an issue
          </a>{" "}
          <span className="text-neutral-400">(a free GitHub account is required)</span>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Under the hood</h2>
        <ul className="space-y-1.5 text-sm text-neutral-600 dark:text-neutral-300">
          <li>Next.js 16 (App Router) · React 19 · Tailwind v4, exported as a fully static site (there is no backend).</li>
          <li>
            The{" "}
            {stixJson ? (
              <a className="link" href={stixJson} target="_blank" rel="noopener noreferrer">
                MITRE ATT&amp;CK STIX bundle (v{meta.version})
              </a>
            ) : (
              <>MITRE ATT&amp;CK STIX bundle</>
            )}{" "}
            is pre-processed at build time into static JSON shards; the search index is pre-built and
            rehydrated in your browser with MiniSearch.
          </li>
          <li>Hosted on GitHub Pages, rebuilt from the latest ATT&amp;CK release on every deploy.</li>
          <li>No ads, no accounts, no tracking cookies.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">A few (fun) facts</h2>
        <ul className="space-y-1.5 text-sm text-neutral-600 dark:text-neutral-300">
          <li>
            The whole Enterprise knowledge base ({c.technique} techniques, {c.group} groups,{" "}
            {c.software} software, {c.campaign} campaigns and {c.mitigation} mitigations) is
            pre-rendered into {entityPages.toLocaleString()} individual entity pages.
          </li>
          <li>
            Search runs entirely client-side: every keystroke is matched against the full corpus in
            your browser, with zero network calls.
          </li>
          <li>
            Search shrugs off typos and partial words, so &ldquo;mimikats&rdquo; still finds
            Mimikatz.
          </li>
          <li>
            Building the campaign-duration view surfaced a small inconsistency in one campaign&apos;s
            dates, since reported upstream to MITRE as a suggested fix.
          </li>
          <li>Because the website is static, there is nothing special to attack 😉</li>
        </ul>
      </section>

      <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-400 dark:border-neutral-800">
        MITRE ATT&amp;CK® is a registered trademark of The MITRE Corporation. This is an independent
        project, not affiliated with or endorsed by MITRE.
      </p>
    </div>
  );
}
