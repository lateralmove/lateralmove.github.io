import Link from "next/link";
import { hrefFor } from "@/lib/entities";
import type { Ref } from "@/lib/types";
import { Dot } from "./Chip";

export function EntityLink({ item, muted }: { item: Ref; muted?: boolean }) {
  return (
    <Link
      href={hrefFor(item.type, item.id)}
      className={
        "group inline-flex items-center gap-1.5 " +
        (muted ? "text-neutral-600 dark:text-neutral-400" : "")
      }
    >
      <Dot type={item.type} />
      <span className="font-mono text-xs text-neutral-400">{item.id}</span>
      <span className="group-hover:underline">{item.name}</span>
    </Link>
  );
}
