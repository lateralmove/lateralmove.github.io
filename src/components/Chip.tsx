import Link from "next/link";
import { TYPE_META } from "@/lib/entities";
import type { EntityType } from "@/lib/types";

/** Colored type pill (dot + label). Pass `href` to make it a clickable link, e.g. the
 *  leading breadcrumb crumb that filters search to this type. */
export function TypeChip({ type, href }: { type: EntityType; href?: string }) {
  const m = TYPE_META[type];
  const cls = `chip ${m.chip}`;
  const inner = (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </>
  );
  return href ? (
    <Link href={href} className={`${cls} transition-opacity hover:opacity-70`}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

export function Dot({ type }: { type: EntityType }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${TYPE_META[type].dot}`} />;
}

export function CoverageBadge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <span
      className={
        "chip " +
        (ok
          ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
          : "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300")
      }
      title={ok ? `Has ${label}` : `No ${label}`}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}
