export type PublicForm = "referral" | "triage" | "source";

export type SupportTemplateId =
  | "behaviour-support-plan"
  | "interim-behaviour-support-plan"
  | "comprehensive-behaviour-support-plan";

export type AppView =
  | { kind: "public"; form: PublicForm }
  | { kind: "support-hub" }
  | { kind: "support-template"; templateId: SupportTemplateId }
  | { kind: "brand" };

export const PUBLIC_FORM_ROUTES = {
  referral: "/referral",
  triage: "/practitioner-triage",
  source: "/source-consultation-register",
} as const satisfies Record<PublicForm, string>;

export const BRAND_PROFILE_ROUTE = "/brand-profile";

export const SUPPORT_TEMPLATE_ROUTES = {
  hub: "/support-templates",
  "behaviour-support-plan": "/support-templates/behaviour-support-plan",
  "interim-behaviour-support-plan": "/support-templates/interim-behaviour-support-plan",
  "comprehensive-behaviour-support-plan": "/support-templates/comprehensive-behaviour-support-plan",
} as const satisfies Record<"hub" | SupportTemplateId, string>;

export const WHATBIT_VECTOR_URL = "https://whatbit.dev/vector";

const DOCUMENT_04_ROUTES = ["/bsa", "/behaviour-support-assessment", "/document-04"];

export function publicFormFromPath(pathname: string): PublicForm {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === PUBLIC_FORM_ROUTES.triage || path.startsWith(`${PUBLIC_FORM_ROUTES.triage}/`)) {
    return "triage";
  }
  if (path === PUBLIC_FORM_ROUTES.source || path.startsWith(`${PUBLIC_FORM_ROUTES.source}/`)) {
    return "source";
  }
  return "referral";
}

export function pathForPublicForm(form: PublicForm): string {
  return PUBLIC_FORM_ROUTES[form];
}

export function supportTemplateFromPath(pathname: string): SupportTemplateId | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  for (const [id, route] of Object.entries(SUPPORT_TEMPLATE_ROUTES)) {
    if (id === "hub") continue;
    if (path === route || path.startsWith(`${route}/`)) return id as SupportTemplateId;
  }
  return null;
}

export function isSupportTemplatesHub(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === SUPPORT_TEMPLATE_ROUTES.hub;
}

export function isBlockedLegacyDocumentRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return DOCUMENT_04_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

export function isBrandProfileRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === BRAND_PROFILE_ROUTE;
}

export function resolveAppView(pathname: string): AppView {
  const path = pathname.replace(/\/+$/, "") || "/";
  const templateId = supportTemplateFromPath(path);
  if (templateId) return { kind: "support-template", templateId };
  if (isSupportTemplatesHub(path)) return { kind: "support-hub" };
  if (isBrandProfileRoute(path)) return { kind: "brand" };
  return { kind: "public", form: publicFormFromPath(path) };
}

export function pathForSupportTemplate(templateId: SupportTemplateId): string {
  return SUPPORT_TEMPLATE_ROUTES[templateId];
}
