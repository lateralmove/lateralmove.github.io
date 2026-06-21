import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Rewrite attack.mitre.org links to internal entity routes where we have a page. */
function internalHref(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "attack.mitre.org") return null;
    const seg = u.pathname.split("/").filter(Boolean);
    const map: Record<string, string> = {
      techniques: "techniques",
      groups: "groups",
      software: "software",
      mitigations: "mitigations",
      campaigns: "campaigns",
    };
    const route = map[seg[0]];
    if (!route || !seg[1]) return null;
    // techniques/T1059/004 -> T1059.004
    const id = route === "techniques" && seg[2] ? `${seg[1]}.${seg[2]}` : seg[1];
    return `/${route}/${id}/`;
  } catch {
    return null;
  }
}

const components: Components = {
  p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-neutral-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">{children}</pre>
  ),
  h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-2 mt-4 text-sm font-semibold first:mt-0">{children}</h4>,
  a: ({ href, children }) => {
    const internal = href ? internalHref(href) : null;
    if (internal) return <Link href={internal} className="link">{children}</Link>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="link">
        {children}
      </a>
    );
  },
};

/** Renders MITRE's Markdown descriptions with structure preserved. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
