import { MatrixView } from "@/components/matrix";
import { ShortcutHint } from "@/components/ShortcutHint";
import { getMeta } from "@/lib/data";

export default async function Home() {
  const meta = await getMeta();
  const c = meta.counts;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {meta.name}
            {meta.version ? ` v${meta.version}` : ""} · Enterprise Matrix
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Know every move before they make it.</h1>
          <p className="mt-1 text-sm text-neutral-500">
            A faster, relationship-first way to browse MITRE ATT&CK — pivot through techniques,
            groups, and coverage gaps, with no dead ends. Press{" "}
            <ShortcutHint className="rounded border px-1 text-[10px] dark:border-neutral-600" /> to search.
          </p>
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
      <MatrixView />
    </div>
  );
}
