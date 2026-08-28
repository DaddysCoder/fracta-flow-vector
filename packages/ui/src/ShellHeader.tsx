import {
  BRAND_PROFILE_ROUTE,
  pathForPublicForm,
  SUPPORT_TEMPLATE_ROUTES,
  WHATBIT_VECTOR_URL,
  type PublicForm,
} from "./routing.js";

export type ShellNavId = PublicForm | "support-hub" | "brand";

const NAV_ITEMS: Array<{ id: ShellNavId; label: string; path: string }> = [
  { id: "referral", label: "Referral", path: pathForPublicForm("referral") },
  { id: "triage", label: "Practitioner Triage", path: pathForPublicForm("triage") },
  { id: "source", label: "Source & Consultation Register", path: pathForPublicForm("source") },
  { id: "support-hub", label: "Support Templates", path: SUPPORT_TEMPLATE_ROUTES.hub },
  { id: "brand", label: "Brand", path: BRAND_PROFILE_ROUTE },
];

function navigate(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export interface ShellHeaderProps {
  activeId: ShellNavId;
}

/**
 * The one nav shared by every top-level Vector view — a single active
 * screen at a time, tab-style, per the design handoff. Never render more
 * than one view's content below this at once.
 */
export function ShellHeader({ activeId }: ShellHeaderProps) {
  return (
    <header className="vector-shell-header no-print">
      <div className="vector-shell-header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: "28px", minWidth: 0 }}>
          <a href="#top" className="vector-shell-logo" style={{ flex: "none" }}>
            VECTOR
          </a>
          <nav aria-label="Vector" className="pill-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="pill-nav-item"
                aria-current={activeId === item.id ? "page" : undefined}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <a href={WHATBIT_VECTOR_URL} style={{ fontSize: "0.8125rem", fontWeight: 600, flex: "none" }}>
          Back to Vector on WHATBIT
        </a>
      </div>
    </header>
  );
}
