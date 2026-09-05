import { lazy, Suspense, useEffect, useState } from "react";
import "./tokens.css";
import "./print.css";
import "./designFidelity.css";
import { ShellHeader } from "./ShellHeader.js";
import {
  isBlockedLegacyDocumentRoute,
  PUBLIC_FORM_ROUTES,
  resolveAppView,
  type AppView,
} from "./routing.js";
import { getTemplateConfig } from "./support-templates/configs.js";

const BrandProfilePanel = lazy(() =>
  import("./commercial/BrandProfilePanel.js").then((m) => ({ default: m.BrandProfilePanel })),
);
const BspReviewAddendumForm = lazy(() =>
  import("./BspReviewAddendumForm.js").then((m) => ({ default: m.BspReviewAddendumForm })),
);
const SupportTemplatesHubPage = lazy(() =>
  import("./commercial/SupportTemplatesHub.js").then((m) => ({ default: m.SupportTemplatesHubPage })),
);
const ProgressReportForm = lazy(() =>
  import("./ProgressReportForm.js").then((m) => ({ default: m.ProgressReportForm })),
);
const ReferralForm = lazy(() => import("./ReferralForm.js").then((m) => ({ default: m.ReferralForm })));
const RrpAssessmentForm = lazy(() =>
  import("./RrpAssessmentForm.js").then((m) => ({ default: m.RrpAssessmentForm })),
);
const SourceForm = lazy(() => import("./SourceForm.js").then((m) => ({ default: m.SourceForm })));
const SupportLetterForm = lazy(() =>
  import("./SupportLetterForm.js").then((m) => ({ default: m.SupportLetterForm })),
);
const TriageForm = lazy(() => import("./TriageForm.js").then((m) => ({ default: m.TriageForm })));
const SupportTemplateWizard = lazy(() =>
  import("./support-templates/SupportTemplateWizard.js").then((m) => ({ default: m.SupportTemplateWizard })),
);

function PageFallback() {
  return (
    <main className="vector-page">
      <div id="top" />
      <div className="vector-page-loading" role="status" aria-live="polite">
        <span className="vector-spinner" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    </main>
  );
}

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
    return (
      <Suspense fallback={<PageFallback />}>
        <SupportTemplatesHubPage />
      </Suspense>
    );
  }

  if (activeView.kind === "support-template") {
    const config = getTemplateConfig(activeView.templateId);
    return (
      <>
        <ShellHeader activeId="support-hub" />
        <Suspense fallback={<PageFallback />}>
          <main className="vector-page">
            <div id="top" />
            <div className="vector-template-page">
              <SupportTemplateWizard config={config} />
            </div>
          </main>
        </Suspense>
      </>
    );
  }

  if (activeView.kind === "paid-document") {
    return (
      <>
        <ShellHeader activeId="support-hub" />
        <Suspense fallback={<PageFallback />}>
          <main className="vector-page">
            <div id="top" />
            <div className="vector-document-page">
              {activeView.documentId === "rrp-assessment" && <RrpAssessmentForm />}
              {activeView.documentId === "support-letter" && <SupportLetterForm />}
              {activeView.documentId === "progress-report" && <ProgressReportForm />}
              {activeView.documentId === "bsp-review-addendum" && <BspReviewAddendumForm />}
            </div>
          </main>
        </Suspense>
      </>
    );
  }

  if (activeView.kind === "brand") {
    return (
      <>
        <ShellHeader activeId="brand" />
        <Suspense fallback={<PageFallback />}>
          <main className="vector-page">
            <div id="top" />
            <div className="vector-brand-page">
              <p className="wizard-eyebrow" style={{ margin: "0 0 8px" }}>
                Organisation
              </p>
              <h1 style={{ margin: "0 0 6px", fontSize: "28px", letterSpacing: "-0.01em" }}>Brand profile</h1>
              <p style={{ margin: "0 0 28px", color: "var(--muted)", fontSize: "15px", lineHeight: 1.6 }}>
                Applied automatically to every exported document.
              </p>
              <BrandProfilePanel />
            </div>
          </main>
        </Suspense>
      </>
    );
  }

  const activeForm = activeView.form;
  const pageClass = activeForm === "source" ? "vector-source-page" : "vector-wizard-page";

  return (
    <>
      <ShellHeader activeId={activeForm} />
      <Suspense fallback={<PageFallback />}>
        <main className="vector-page">
          <div id="top" />
          <section className={pageClass} aria-live="polite">
            {activeForm === "referral" && <ReferralForm onSubmitted={() => undefined} />}
            {activeForm === "triage" && <TriageForm onSubmitted={() => undefined} />}
            {activeForm === "source" && <SourceForm priorFields={[]} onSubmitted={() => undefined} />}
          </section>
        </main>
      </Suspense>
    </>
  );
}

export { PUBLIC_FORM_ROUTES };
