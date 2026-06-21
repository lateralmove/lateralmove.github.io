// Shared (client + server safe) metadata about entity types: labels, routes, colors.
import type { EntityType } from "./types";

export interface TypeMeta {
  label: string;
  plural: string;
  route: string;
  /** Tailwind utility fragments for chips/nodes, kept explicit so JIT keeps them. */
  dot: string;
  chip: string;
  /** Hex used by the SVG scoped graph. */
  hex: string;
}

export const TYPE_META: Record<EntityType, TypeMeta> = {
  technique: {
    label: "Technique",
    plural: "Techniques",
    route: "techniques",
    dot: "bg-rose-500",
    chip: "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300",
    hex: "#f43f5e",
  },
  group: {
    label: "Group",
    plural: "Groups",
    route: "groups",
    dot: "bg-amber-500",
    chip: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300",
    hex: "#f59e0b",
  },
  software: {
    label: "Software",
    plural: "Software",
    route: "software",
    dot: "bg-violet-500",
    chip: "border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300",
    hex: "#8b5cf6",
  },
  campaign: {
    label: "Campaign",
    plural: "Campaigns",
    route: "campaigns",
    dot: "bg-orange-500",
    chip: "border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300",
    hex: "#f97316",
  },
  mitigation: {
    label: "Mitigation",
    plural: "Mitigations",
    route: "mitigations",
    dot: "bg-emerald-500",
    chip: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
    hex: "#10b981",
  },
  "data-component": {
    label: "Data Component",
    plural: "Data Components",
    route: "data-components",
    dot: "bg-cyan-500",
    chip: "border-cyan-300 text-cyan-700 dark:border-cyan-800 dark:text-cyan-300",
    hex: "#06b6d4",
  },
};

export const ALL_TYPES = Object.keys(TYPE_META) as EntityType[];

export function hrefFor(type: EntityType, id: string): string {
  return `/${TYPE_META[type].route}/${id}/`;
}
