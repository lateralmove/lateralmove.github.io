import type { Metadata } from "next";
import { EntityDetail } from "@/components/EntityDetail";
import { getEntity, getStaticIds } from "@/lib/data";
import { entityMetadata } from "@/lib/seo";
import type { DataComponent } from "@/lib/types";

export const dynamicParams = false;
export const generateStaticParams = () => getStaticIds("data-component");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const e = await getEntity<DataComponent>("data-component", id);
  return entityMetadata("data-component", e);
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = await getEntity<DataComponent>("data-component", id);
  return <EntityDetail entity={entity} />;
}
