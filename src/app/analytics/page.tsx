import { AnalyticsView } from "@/components/AnalyticsView";
import { getMatrix } from "@/lib/data";

export const metadata = { title: "Coverage Analytics · Lateral Move" };

export default async function AnalyticsPage() {
  // Canonical MITRE kill-chain order, straight from the matrix (tactic_refs).
  const matrix = await getMatrix();
  return <AnalyticsView tacticOrder={matrix.tactics.map((t) => t.name)} />;
}
