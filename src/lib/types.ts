// Shared types mirroring the shape emitted by scripts/build-data.mjs.

export type EntityType =
  | "technique"
  | "group"
  | "software"
  | "campaign"
  | "mitigation"
  | "data-component";

/** Compact reference embedded in relationship lists. */
export interface Ref {
  id: string;
  name: string;
  type: EntityType;
  /** Optional edge context — e.g. the technique-specific guidance on a `mitigatedBy` edge. */
  description?: string;
}

export interface TacticRef {
  id: string;
  name: string;
  shortName: string;
}

export interface LogSource {
  component: string | null;
  channel: string | null;
  dataComponentId: string | null;
}

export interface Analytic {
  id: string;
  name: string;
  description: string | null;
  platforms: string[];
  logSources: LogSource[];
}

export interface DetectionStrategy {
  id: string;
  name: string;
  analytics: Analytic[];
}

export interface Detection {
  strategies: DetectionStrategy[];
  dataComponents: { id: string; name: string; type: "data-component" }[];
  hasDetection: boolean;
}

export interface Coverage {
  hasMitigation: boolean;
  hasDetection: boolean;
}

export interface Technique {
  id: string;
  stixId: string;
  type: "technique";
  name: string;
  isSubtechnique: boolean;
  parent: Ref | null;
  platforms: string[];
  tactics: TacticRef[];
  description: string;
  url: string | null;
  relationships: {
    subtechniques: Ref[];
    usedByGroups: Ref[];
    usedBySoftware: Ref[];
    usedByCampaigns: Ref[];
    mitigatedBy: Ref[];
  };
  detection: Detection;
  coverage: Coverage;
}

export interface Group {
  id: string;
  type: "group";
  name: string;
  description: string;
  url: string | null;
  aliases: string[];
  relationships: {
    usesTechniques: Ref[];
    usesSoftware: Ref[];
    attributedCampaigns: Ref[];
  };
}

export interface Software {
  id: string;
  type: "software";
  name: string;
  description: string;
  url: string | null;
  softwareType: "malware" | "tool";
  platforms: string[];
  aliases: string[];
  relationships: {
    usesTechniques: Ref[];
    usedByGroups: Ref[];
    usedByCampaigns: Ref[];
  };
}

export interface Campaign {
  id: string;
  type: "campaign";
  name: string;
  description: string;
  url: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  relationships: {
    attributedTo: Ref[];
    usesTechniques: Ref[];
    usesSoftware: Ref[];
  };
}

export interface Mitigation {
  id: string;
  type: "mitigation";
  name: string;
  description: string;
  url: string | null;
  relationships: { mitigatesTechniques: Ref[] };
}

export interface DataComponent {
  id: string;
  type: "data-component";
  name: string;
  description: string;
  url: string | null;
  logSources: { name?: string; channel?: string }[];
  detectionStrategies: { id: string; name: string; techniqueId?: string }[];
  relationships: {
    detectsTechniques: Ref[];
    analytics: { id: string; name: string }[];
  };
}

export type Entity = Technique | Group | Software | Campaign | Mitigation | DataComponent;

// ---- matrix ----
export interface TechCard {
  id: string;
  name: string;
  platforms: string[];
  hasMitigation: boolean;
  hasDetection: boolean;
  groups: number;
  subtechniques?: TechCard[];
}
export interface TacticColumn {
  id: string;
  name: string;
  shortName: string;
  techniques: TechCard[];
}
export interface MatrixData {
  tactics: TacticColumn[];
}

// ---- search ----
export interface SearchDoc {
  id: string;
  type: EntityType;
  name: string;
  desc: string;
  sub?: boolean;
  tactics?: string[];
  platforms?: string[];
  groups?: number;
  techniques?: number;
  software?: number;
  campaigns?: number;
  kind?: "malware" | "tool";
  hasMitigation?: boolean;
  hasDetection?: boolean;
  firstSeen?: string | null;
  lastSeen?: string | null;
}

export interface Meta {
  name: string;
  version: string | null;
  domain: string;
  generatedAt: string;
  source: string;
  counts: Record<string, number>;
}

export type Manifest = Record<EntityType, string[]>;
