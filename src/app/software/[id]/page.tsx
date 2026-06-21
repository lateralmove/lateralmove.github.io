import type { Metadata } from "next";
import { EntityDetail } from "@/components/EntityDetail";
import { getEntity, getStaticIds } from "@/lib/data";
import type { Software } from "@/lib/types";

export const dynamicParams = false;
export const generateStaticParams = () => getStaticIds("software");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const e = await getEntity<Software>("software", id);
  return { title: `${e.id} ${e.name} · Lateral Move` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntity<Software>("software", id);
  return <EntityDetail entity={entity} />;
}
