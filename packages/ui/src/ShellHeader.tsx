import { useState } from "react";
import {
  BRAND_PROFILE_ROUTE,
  pathForPublicForm,
  SUPPORT_TEMPLATE_ROUTES,
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

export function ShellHeader({ activeId }: ShellHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileGroup =
    activeId === "support-hub" ? "templates" : activeId === "brand" ? "brand" : "forms";

  function go(path: string) {
    setMobileMenuOpen(false);
    navigate(path);
  }

  return (
    <>
      <header className="vector-shell-header no-print">
        <div className="vector-shell-header-inner">
          <div className="vector-shell-primary">
            <a href="#top" className="vector-shell-logo">
              VECTOR
            </a>

            <nav aria-label="Vector" className="pill-nav">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="pill-nav-item"
                  aria-current={activeId === item.id ? "page" : undefined}
                  onClick={() => go(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              className="vector-shell-menu-button"
              aria-label="Open Vector navigation"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              ☰
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav className="vector-mobile-menu" aria-label="Vector mobile menu">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeId === item.id ? "page" : undefined}
                onClick={() => go(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
      </header>

      <nav className="vector-mobile-tabbar no-print" aria-label="Vector sections">
        <button
          type="button"
          aria-current={mobileGroup === "forms" ? "page" : undefined}
          onClick={() => go(pathForPublicForm("referral"))}
        >
          <span className="vector-mobile-tab-dot" aria-hidden="true" />
          Forms
        </button>
        <button
          type="button"
          aria-current={mobileGroup === "templates" ? "page" : undefined}
          onClick={() => go(SUPPORT_TEMPLATE_ROUTES.hub)}
        >
          <span className="vector-mobile-tab-dot" aria-hidden="true" />
          Templates
        </button>
        <button
          type="button"
          aria-current={mobileGroup === "brand" ? "page" : undefined}
          onClick={() => go(BRAND_PROFILE_ROUTE)}
        >
          <span className="vector-mobile-tab-dot" aria-hidden="true" />
          Brand
        </button>
      </nav>
    </>
  );
}
