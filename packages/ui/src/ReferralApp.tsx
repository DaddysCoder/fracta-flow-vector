import { useEffect, useState } from "react";
import "./tokens.css";
import "./print.css";
import { BrandProfilePanel } from "./commercial/BrandProfilePanel.js";
import { useVectorCommercial } from "./commercial/CommercialContext.js";
import { SupportTemplatesHubPage } from "./commercial/SupportTemplatesHub.js";
import { ReferralForm } from "./ReferralForm.js";
import { ShellHeader } from "./ShellHeader.js";
import { SourceForm } from "./SourceForm.js";
import { TriageForm } from "./TriageForm.js";
import {
  isBlockedLegacyDocumentRoute,
  PUBLIC_FORM_ROUTES,
  resolveAppView,
  type AppView,
  type PublicForm,
} from "./routing.js";
import { getTemplateConfig } from "./support-templates/configs.js";
import { SupportTemplateWizard } from "./support-templates/SupportTemplateWizard.js";

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

function readActiveView(): AppView {
  if (typeof window === "undefined") return { kind: "public", form: "referral" };
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "public", form: "referral" };
  if (isBlockedLegacyDocumentRoute(path)) return { kind: "public", form: "referral" };
  return resolveAppView(path);
}

/**
 * Public Vector launch shell — exactly three clinical forms.
 * Document 04 and Documents 05–09 are not imported or exposed here.
 */
export function ReferralApp() {
  const [activeView, setActiveView] = useState<AppView>(() => readActiveView());
  const { entitlements } = useVectorCommercial();

  useEffect(() => {
    function syncFromLocation() {
      setActiveView(readActiveView());
    }
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  if (activeView.kind === "support-hub") {
    return <SupportTemplatesHubPage />;
  }

  if (activeView.kind === "support-template") {
    const config = getTemplateConfig(activeView.templateId);
    return (
      <>
        <ShellHeader activeId="support-hub" />
        <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "2rem 24px 4rem" }}>
          <div id="top" />
          <SupportTemplateWizard config={config} />
        </main>
      </>
    );
  }

  if (activeView.kind === "brand") {
    return (
      <>
        <ShellHeader activeId="brand" />
        <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "2rem 24px 4rem" }}>
          <div id="top" />
          <p style={{ color: "var(--purple)", fontWeight: 700, letterSpacing: "0.04em", margin: "0 0 0.25rem", textTransform: "uppercase", fontSize: "0.6875rem" }}>
            Organisation
          </p>
          <h1 style={{ margin: "0 0 1.5rem" }}>Brand profile</h1>
          <BrandProfilePanel />
        </main>
      </>
    );
  }

  const activeForm = activeView.form;
  const activeMeta = PUBLIC_FORMS.find((form) => form.id === activeForm) ?? PUBLIC_FORMS[0]!;

  return (
    <>
      <ShellHeader activeId={activeForm} />

      <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "2rem 24px 4rem" }}>
        <div id="top" />
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.5rem" }}>{activeMeta.title}</h1>
          <p style={{ margin: 0, maxWidth: "680px" }}>
            Complete forms in your browser. Participant and client form content stays on this device
            during normal use and is not stored on WHATBIT servers.
          </p>
          <p className="field-note no-print" style={{ marginTop: "0.5rem" }}>
            {entitlements.plan === "paid"
              ? "Vector Paid is active in this browser."
              : "Three forms are free to use. DOCX, Print/PDF, organisation branding and Support Templates require Vector Paid."}
          </p>
        </div>

        <section aria-live="polite">
          {activeForm === "referral" && <ReferralForm onSubmitted={() => undefined} />}
          {activeForm === "triage" && <TriageForm onSubmitted={() => undefined} />}
          {activeForm === "source" && <SourceForm priorFields={[]} onSubmitted={() => undefined} />}
        </section>
      </main>
    </>
  );
}

export { PUBLIC_FORM_ROUTES };
