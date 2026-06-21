import type { Metadata } from "next";
import { EntityDetail } from "@/components/EntityDetail";
import { getEntity, getStaticIds } from "@/lib/data";
import type { Campaign } from "@/lib/types";

export const dynamicParams = false;
export const generateStaticParams = () => getStaticIds("campaign");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const e = await getEntity<Campaign>("campaign", id);
  return { title: `${e.id} ${e.name} · Lateral Move` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntity<Campaign>("campaign", id);
  return <EntityDetail entity={entity} />;
}
