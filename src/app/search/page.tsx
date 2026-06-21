import { Suspense } from "react";
import { SearchView } from "@/components/SearchView";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-neutral-400">Loading…</div>}>
      <SearchView />
    </Suspense>
  );
}
