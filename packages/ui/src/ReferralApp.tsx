import { useEffect, useState } from "react";
import "./tokens.css";
import "./print.css";
import "./designFidelity.css";
import { BrandProfilePanel } from "./commercial/BrandProfilePanel.js";
import { SupportTemplatesHubPage } from "./commercial/SupportTemplatesHub.js";
import { ProgressReportForm } from "./ProgressReportForm.js";
import { ReferralForm } from "./ReferralForm.js";
import { RrpAssessmentForm } from "./RrpAssessmentForm.js";
import { ShellHeader } from "./ShellHeader.js";
import { SourceForm } from "./SourceForm.js";
import { SupportLetterForm } from "./SupportLetterForm.js";
import { TriageForm } from "./TriageForm.js";
import {
  isBlockedLegacyDocumentRoute,
  PUBLIC_FORM_ROUTES,
  resolveAppView,
  type AppView,
} from "./routing.js";
import { getTemplateConfig } from "./support-templates/configs.js";
import { SupportTemplateWizard } from "./support-templates/SupportTemplateWizard.js";

function readActiveView(): AppView {
  if (typeof window === "undefined") return { kind: "public", form: "referral" };
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "public", form: "referral" };
  if (isBlockedLegacyDocumentRoute(path)) return { kind: "public", form: "referral" };
  return resolveAppView(path);
}

export function ReferralApp() {
  const [activeView, setActiveView] = useState<AppView>(() => readActiveView());

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
        <main className="vector-page">
          <div id="top" />
          <div className="vector-template-page">
            <SupportTemplateWizard config={config} />
          </div>
        </main>
      </>
    );
  }

  if (activeView.kind === "paid-document") {
    return (
      <>
        <ShellHeader activeId="support-hub" />
        <main className="vector-page">
          <div id="top" />
          <div className="vector-document-page">
            {activeView.documentId === "rrp-assessment" && <RrpAssessmentForm />}
            {activeView.documentId === "support-letter" && <SupportLetterForm />}
            {activeView.documentId === "progress-report" && <ProgressReportForm />}
          </div>
        </main>
      </>
    );
  }

  if (activeView.kind === "brand") {
    return (
      <>
        <ShellHeader activeId="brand" />
        <main className="vector-page">
          <div id="top" />
          <div className="vector-brand-page">
            <p className="wizard-eyebrow" style={{ margin: "0 0 8px" }}>
              Brand Profile · Paid
            </p>
            <h1 style={{ margin: "0 0 24px", fontSize: "28px", letterSpacing: "-0.01em" }}>
              Document template style
            </h1>
            <BrandProfilePanel />
          </div>
        </main>
      </>
    );
  }

  const activeForm = activeView.form;
  const pageClass = activeForm === "source" ? "vector-source-page" : "vector-wizard-page";

  return (
    <>
      <ShellHeader activeId={activeForm} />
      <main className="vector-page">
        <div id="top" />
        <section className={pageClass} aria-live="polite">
          {activeForm === "referral" && <ReferralForm onSubmitted={() => undefined} />}
          {activeForm === "triage" && <TriageForm onSubmitted={() => undefined} />}
          {activeForm === "source" && <SourceForm priorFields={[]} onSubmitted={() => undefined} />}
        </section>
      </main>
    </>
  );
}

export { PUBLIC_FORM_ROUTES };
