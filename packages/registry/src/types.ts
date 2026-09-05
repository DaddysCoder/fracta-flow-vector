export type Tier = 0 | 1 | 2 | 3;
export type Pathway = 'no_rp' | 'interim' | 'comprehensive';
export type TriState = 'yes' | 'no' | 'unanswered';
export type Transition = 'carry' | 'confirm' | 'update' | 'revise' | 'new' | 'retire';

export type FieldType =
  | 'short_text' | 'long_text' | 'date' | 'number'
  | 'select' | 'multiselect' | 'tristate' | 'file';

export interface FieldDef {
  id: string;
  label: string;
  /** 0 identity · 1 perishable fact · 2 observation · 3 interpretation */
  tier: Tier;
  clinical: boolean;
  type: FieldType;
  group?: string;
  repeatable: boolean;
  /** EXACTLY ONE section. More than one asked-in is a write-twice bug. */
  askedIn: string;
  /** Sections that display the value. */
  rendersIn: string[];
  /** Authoring steps this field feeds WITHOUT appearing in the output. */
  informs: string[];
  transition: { default: Transition; allowed: Transition[] };
  stalenessDays: number | null;
  requires: string[];
  pathways: Pathway[];
  phraseBank: boolean;
  note?: string;
}

export interface SectionDef { id: string; title: string }
export interface DocumentDef {
  title: string;
  st: string;
  pathways: Pathway[];
  sections: SectionDef[];
  /** Practitioner-facing framing note for the whole document, e.g. a boundary with another product. */
  note?: string;
}
