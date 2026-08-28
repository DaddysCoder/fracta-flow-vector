import type { TriageTask } from "@pbs/core";
import { useState } from "react";
import "./tokens.css";
import "./print.css";
import { ReferralForm } from "./ReferralForm.js";
import { SourceForm } from "./SourceForm.js";
import { TriageForm } from "./TriageForm.js";
import { useVectorCommercial } from "./commercial/CommercialContext.js";

type PublicForm = "referral" | "triage" | "source";

const EMPTY_TRIAGE_TASK: TriageTask = {
  id: "vector-standalone-triage",
  referralDocumentId: "vector-standalone-referral",
  createdAt: "1970-01-01T00:00:00.000Z",
  priority: "standard",
  fields: [],
};

const PUBLIC_FORMS: Array<{ id: PublicForm; title: string; description: string }> = [
  {
    id: "referral",
    title: "Referral",
    description: "Capture referral information and create a practitioner triage task.",
  },
  {
    id: "triage",
    title: "Practitioner Triage",
    description: "Complete practitioner triage as a standalone form.",
  },
  {
    id: "source",
    title: "Source & Consultation Register",
    description: "Record sources and consultation information as a standalone register.",
  },
];

/**
 * Public Vector launch shell.
 *
 * Exactly three clinical forms are navigable here. Each form runs locally
 * in standalone mode; participant/client answers are kept in React state and
 * are never posted to the Worker. The only network activity in this app is
 * commercial entitlement/billing metadata handled by VectorCommercialProvider.
 *
 * Document 04 / Combined BSA-FBA remains in the repository for separate
 * architecture work but is deliberately not imported or exposed here.
 */
export function ReferralApp() {
  const [activeForm, setActiveForm] = useState<PublicForm>("referral");
  const { entitlements } = useVectorCommercial();

  return (
    <main style={{ maxWidth: "820px", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--purple)", fontWeight: 800, letterSpacing: "0.04em", margin: 0 }}>
          VECTOR
        </p>
        <h1 style={{ margin: "0.25rem 0 0.5rem" }}>Practical behaviour support forms</h1>
        <p style={{ margin: 0, maxWidth: "680px" }}>
          Complete forms in your browser. Participant and client form content stays on this device
          during normal use and is not stored on WHATBIT servers.
        </p>
        <p className="field-note no-print" style={{ marginTop: "0.5rem" }}>
          {entitlements.plan === "paid"
            ? "Vector Paid is active in this browser."
            : "Three forms are free to use. DOCX, Print/PDF, organisation branding and Support Templates require Vector Paid."}
        </p>
      </header>

      <nav
        aria-label="Vector forms"
        className="no-print"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}
      >
        {PUBLIC_FORMS.map((form) => {
          const selected = activeForm === form.id;
          return (
            <button
              key={form.id}
              type="button"
              className={selected ? "primary" : undefined}
              aria-pressed={selected}
              onClick={() => setActiveForm(form.id)}
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

      <section aria-live="polite">
        {activeForm === "referral" && <ReferralForm onSubmitted={() => undefined} />}
        {activeForm === "triage" && (
          <TriageForm task={EMPTY_TRIAGE_TASK} onSubmitted={() => undefined} />
        )}
        {activeForm === "source" && <SourceForm priorFields={[]} onSubmitted={() => undefined} />}
      </section>
    </main>
  );
}
