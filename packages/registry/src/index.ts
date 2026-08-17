import documentsJson from "./documents.json";
import fieldsJson from "./fields.json";
import pathwaysJson from "./pathways.json";
import type { DocumentDef, FieldDef } from "./types.js";

export type {
  DocumentDef,
  FieldDef,
  FieldType,
  Pathway,
  SectionDef,
  Tier,
  Transition,
  TriState,
} from "./types.js";

export interface PathwayState {
  label: string;
  permits: string[];
  forbids: string[];
  blocks?: string[];
  notes?: string;
}

export interface Gate {
  setBy?: string;
  unlocks?: string[];
  blocksReleaseOf?: string[];
  requires?: string;
  default?: null;
  notes?: string;
}

export interface Pathways {
  states: Record<string, PathwayState>;
  gates: Record<string, Gate>;
  rrpRecordIndependentFlags: string[];
}

export interface Registry {
  fields: FieldDef[];
  documents: Record<string, DocumentDef>;
  pathways: Pathways;
}

export const registry: Registry = {
  fields: fieldsJson as FieldDef[],
  documents: documentsJson as Record<string, DocumentDef>,
  pathways: pathwaysJson as Pathways,
};
