import { useEffect, useState } from "react";
import "./tokens.css";
import "./print.css";
import { BrandProfilePanel } from "./commercial/BrandProfilePanel.js";
import { useVectorCommercial } from "./commercial/CommercialContext.js";
import { SupportTemplatesHub } from "./commercial/SupportTemplatesHub.js";
import { ReferralForm } from "./ReferralForm.js";
import { SourceForm } from "./SourceForm.js";
import { TriageForm } from "./TriageForm.js";
import {
  pathForPublicForm,
  publicFormFromPath,
  WHATBIT_VECTOR_URL,
  type PublicForm,
} from "./routing.js";

const PUBLIC_FORMS: Array<{ id: PublicForm; title: string; description: string }> = [
  {
    id: "referral",
    title: "Referral",
    description: "Capture referral information locally in your browser.",
  },
  {
    id: "triage",
    title: "Practitioner Triage",
    description: "Complete practitioner triage as a standalone form.",
  },
  {
    id: "source",
    title: "Source & Consultation Register",
    description: "Record sources and consultation information locally.",
  },
];

function readActiveForm(): PublicForm {
  if (typeof window === "undefined") return "referral";
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "referral";
  return publicFormFromPath(path);
}

/**
 * Public Vector launch shell — exactly three clinical forms.
 * Document 04 and Documents 05–09 are not imported or exposed here.
 */
export function ReferralApp() {
  const [activeForm, setActiveForm] = useState<PublicForm>(() => readActiveForm());
  const { entitlements } = useVectorCommercial();

  useEffect(() => {
    function syncFromLocation() {
      setActiveForm(readActiveForm());
    }
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  function navigateTo(form: PublicForm) {
    const nextPath = pathForPublicForm(form);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setActiveForm(form);
  }

  const activeMeta = PUBLIC_FORMS.find((form) => form.id === activeForm) ?? PUBLIC_FORMS[0]!;

  return (
    <main style={{ maxWidth: "820px", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--purple)", fontWeight: 800, letterSpacing: "0.04em", margin: 0 }}>
          VECTOR
        </p>
        <h1 style={{ margin: "0.25rem 0 0.5rem" }}>{activeMeta.title}</h1>
        <p style={{ margin: 0, maxWidth: "680px" }}>
          Complete forms in your browser. Participant and client form content stays on this device
          during normal use and is not stored on WHATBIT servers.
        </p>
        <p className="field-note no-print" style={{ marginTop: "0.5rem" }}>
          {entitlements.plan === "paid"
            ? "Vector Paid is active in this browser."
            : "Three forms are free to use. DOCX, Print/PDF, organisation branding and Support Templates require Vector Paid."}
        </p>
        <p className="no-print" style={{ marginTop: "0.75rem" }}>
          <a href={WHATBIT_VECTOR_URL}>Back to Vector on WHATBIT</a>
        </p>
      </header>

      <nav
        aria-label="Vector forms"
        className="no-print"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        {PUBLIC_FORMS.map((form) => {
          const selected = activeForm === form.id;
          return (
            <button
              key={form.id}
              type="button"
              className={selected ? "primary" : undefined}
              aria-pressed={selected}
              aria-current={selected ? "page" : undefined}
              onClick={() => navigateTo(form.id)}
              style={{ textAlign: "left", minHeight: "96px" }}
            >
              <strong style={{ display: "block", marginBottom: "0.25rem" }}>{form.title}</strong>
              <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 400 }}>
                {form.description}
              </span>
            </button>
          );
        })}
      </nav>

      <BrandProfilePanel />
      <SupportTemplatesHub />

      <section aria-live="polite">
        {activeForm === "referral" && <ReferralForm onSubmitted={() => undefined} />}
        {activeForm === "triage" && <TriageForm onSubmitted={() => undefined} />}
        {activeForm === "source" && <SourceForm priorFields={[]} onSubmitted={() => undefined} />}
      </section>
    </main>
  );
}
