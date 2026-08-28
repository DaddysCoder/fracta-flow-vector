export type PublicForm = "referral" | "triage" | "source";

export const PUBLIC_FORM_ROUTES = {
  referral: "/referral",
  triage: "/practitioner-triage",
  source: "/source-consultation-register",
} as const satisfies Record<PublicForm, string>;

export const WHATBIT_VECTOR_URL = "https://whatbit.dev/vector";

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
