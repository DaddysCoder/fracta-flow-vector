import { EMPTY_TEMPLATE_STATE, type SupportTemplateState } from "./types.js";

export const STORAGE_KEYS = {
  generic: "vectorBehaviourSupportPlanData",
  interim: "vectorInterimBspData",
  comprehensive: "vectorComprehensiveBspData",
} as const;

export const STORAGE_DISCLOSURE =
  "Support template content is saved in this browser's session storage only. It is not sent to Vector or WHATBIT servers.";

export function loadTemplateState(key: string): SupportTemplateState | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeState(parsed as Partial<SupportTemplateState>);
  } catch {
    return null;
  }
}

export function saveTemplateState(key: string, state: SupportTemplateState): void {
  sessionStorage.setItem(key, JSON.stringify(state));
}

export function clearTemplateState(key: string): void {
  sessionStorage.removeItem(key);
}

function normalizeState(raw: Partial<SupportTemplateState>): SupportTemplateState {
  return {
    v: raw.v && typeof raw.v === "object" ? { ...raw.v } : {},
    behaviours: Array.isArray(raw.behaviours) && raw.behaviours.length > 0 ? raw.behaviours : EMPTY_TEMPLATE_STATE.behaviours,
    structLists: raw.structLists && typeof raw.structLists === "object" ? { ...EMPTY_TEMPLATE_STATE.structLists, ...raw.structLists } : { ...EMPTY_TEMPLATE_STATE.structLists },
    lists: raw.lists && typeof raw.lists === "object" ? { ...EMPTY_TEMPLATE_STATE.lists, ...raw.lists } : { ...EMPTY_TEMPLATE_STATE.lists },
    rrpTypes: raw.rrpTypes && typeof raw.rrpTypes === "object" ? { ...raw.rrpTypes } : {},
    rrpFields: raw.rrpFields && typeof raw.rrpFields === "object" ? { ...raw.rrpFields } : {},
    confirms: raw.confirms && typeof raw.confirms === "object" ? { ...raw.confirms } : {},
  };
}
