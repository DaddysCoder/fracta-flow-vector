export type TemplateKind = "generic" | "interim" | "comprehensive";

export interface BehaviourEntry {
  name: string;
  desc: string;
  freq: string;
  intensity: string;
  triggers: string;
}

export interface StructColumn {
  key: string;
  label: string;
  multiline?: boolean;
}

export interface SupportTemplateState {
  v: Record<string, string>;
  behaviours: BehaviourEntry[];
  structLists: Record<string, Record<string, string>[]>;
  lists: Record<string, string[]>;
  rrpTypes: Record<string, boolean>;
  rrpFields: Record<string, Record<string, string>>;
  confirms: Record<string, boolean>;
}

export type StepKind =
  | "text"
  | "longs"
  | "struct"
  | "behaviours"
  | "rrp"
  | "lists"
  | "diff"
  | "summary";

export interface TextFieldDef {
  key: string;
  label: string;
  defaultValue?: string;
  tag?: "FROM REFERRAL" | "FROM INTERIM" | null;
}

export interface LongFieldDef {
  key: string;
  label: string;
  defaultValue?: string;
  tag?: "FROM REFERRAL" | "FROM INTERIM" | null;
}

export interface StructListDef {
  key: string;
  label: string;
  columns: StructColumn[];
}

export interface ListFieldDef {
  key: string;
  label: string;
  placeholder: string;
}

export interface TemplateStep {
  code: string;
  title: string;
  note?: string;
  kind?: StepKind;
  text?: TextFieldDef[];
  longs?: LongFieldDef[];
  struct?: StructListDef[];
  lists?: ListFieldDef[];
  confirm?: [string, string];
  selfDeclare?: boolean;
}

export interface TemplateConfig {
  id: string;
  eyebrow: string;
  storageKey: string;
  saveLabel: string;
  completionTitle: string;
  completionNote?: string;
  steps: (ctx: TemplateBuildContext) => TemplateStep[];
  summaryRows: (state: SupportTemplateState) => Array<{ k: string; v: string }>;
}

export interface TemplateBuildContext {
  referral: Record<string, string>;
  interim: SupportTemplateState | null;
  hasInterim: boolean;
}

export const EMPTY_TEMPLATE_STATE: SupportTemplateState = {
  v: {},
  behaviours: [{ name: "Behaviour 1", desc: "", freq: "", intensity: "", triggers: "" }],
  structLists: { sources: [], consultPerson: [], consultOthers: [] },
  lists: { cease: [], distribution: [] },
  rrpTypes: {},
  rrpFields: {},
  confirms: {},
};
