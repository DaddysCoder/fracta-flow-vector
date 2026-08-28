import { canUseFeature, type PaidFeature } from "./entitlements.js";
import { useVectorCommercial } from "./CommercialContext.js";
import { ShellHeader } from "../ShellHeader.js";
import { pathForPaidDocument, pathForSupportTemplate, type PaidDocumentId, type SupportTemplateId } from "../routing.js";

const SUPPORT_TEMPLATES: Array<{
  id: SupportTemplateId;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    id: "behaviour-support-plan",
    eyebrow: "Behaviour Support Plan",
    title: "Behaviour Support Plan",
    description: "For participants with no regulated restrictive practice.",
  },
  {
    id: "interim-behaviour-support-plan",
    eyebrow: "Interim BSP",
    title: "Interim Behaviour Support Plan",
    description: "Immediate risk management while fuller assessment is underway.",
  },
  {
    id: "comprehensive-behaviour-support-plan",
    eyebrow: "Comprehensive BSP",
    title: "Comprehensive Behaviour Support Plan",
    description: "The final plan, superseding any Interim BSP.",
  },
];

/** Documents 10-12 — net-new, paid, standalone. The design handoff's
 * prototype has no nav or hub-card wiring for these at all (its top nav
 * and hub cards are frozen at the original 5/3-item lists); listing them
 * here, gated the same way as the BSP cards above, is this build's own
 * reasonable choice for making them reachable and discoverable rather
 * than dead routes only reachable by typing a URL. */
const PAID_DOCUMENTS: Array<{
  id: PaidDocumentId;
  feature: PaidFeature;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    id: "rrp-assessment",
    feature: "rrp_assessment",
    eyebrow: "RRP Assessment",
    title: "RRP Assessment",
    description: "Required before an Interim BSP for any participant flagged with a possible or confirmed restrictive practice.",
  },
  {
    id: "support-letter",
    feature: "support_letter",
    eyebrow: "Support Letter",
    title: "Support Letter",
    description: "A funding recommendation letter with functional impact, recommended supports and an itemised quote.",
  },
  {
    id: "progress-report",
    feature: "progress_report",
    eyebrow: "Progress Report",
    title: "Progress Report",
    description: "Summarises plan progress for an NDIS plan review.",
  },
];

const ARC_FONT_STACK =
  "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const ARC_CROSS_SELL: Array<{ id: string; title: string; description: string; stripe: string; preview: string }> = [
  {
    id: "admin-hub",
    title: "Admin Hub",
    description: "Org-wide stats and settings in one place.",
    stripe: "#5B21B6",
    preview: "▦ ▦ ▦ ▦",
  },
  {
    id: "document-checker",
    title: "Document Checker",
    description: "Catches missing or inconsistent fields before you export.",
    stripe: "#2C6E4F",
    preview: "✓ ✓ ! ✓",
  },
  {
    id: "referral-tracker",
    title: "Referral Tracker",
    description: "A 4-column board for every referral's status.",
    stripe: "#1A5FB4",
    preview: "▤ ▤ ▤ ▤",
  },
];

/** Arc CRM's own brand (Geist, ink #171717) — intentionally not overridden
 * by Vector's brand picker, so this reads as a distinct product. Visual
 * reference only: no real Arc integration exists yet. */
function ArcCrossSell() {
  return (
    <section
      aria-labelledby="arc-cross-sell-heading"
      className="no-print"
      style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border, #e5e5e5)", fontFamily: ARC_FONT_STACK }}
    >
      <h2 id="arc-cross-sell-heading" style={{ marginTop: 0, fontSize: "1rem", color: "#171717" }}>
        Arc CRM · coming soon
      </h2>
      <p style={{ margin: "0 0 1rem", color: "#171717" }}>
        Admin tools for practices running Vector at scale, from the same WhatBit family.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {ARC_CROSS_SELL.map((card) => (
          <li
            key={card.id}
            style={{
              borderTop: `4px solid ${card.stripe}`,
              border: "1px solid #e5e5e5",
              borderTopWidth: "4px",
              borderTopColor: card.stripe,
              borderRadius: "10px",
              padding: "0.75rem",
              background: "#fff",
              color: "#171717",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#92400E",
                background: "#FEF3C7",
                borderRadius: "999px",
                padding: "0.15rem 0.5rem",
              }}
            >
              <span aria-hidden="true" style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#D97706" }} />
              COMING SOON
            </span>
            <strong style={{ display: "block", marginTop: "0.5rem" }}>{card.title}</strong>
            <span style={{ display: "block", fontSize: "0.875rem", margin: "0.25rem 0 0.5rem" }}>{card.description}</span>
            <div
              aria-hidden="true"
              style={{
                fontFamily: "'Geist Mono', ui-monospace, monospace",
                fontSize: "0.75rem",
                background: "#FAFAFA",
                border: "1px solid #e5e5e5",
                borderRadius: "6px",
                padding: "0.5rem",
                height: "64px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: "0.2em",
              }}
            >
              {card.preview}
            </div>
            <span style={{ display: "block", marginTop: "0.5rem", fontSize: "0.8rem", fontWeight: 600, color: card.stripe }}>
              See it in Arc →
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function navigateTo(nextPath: string) {
  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

export function SupportTemplatesHub() {
  const { entitlements, requestUpgrade } = useVectorCommercial();
  const canUseTemplates = canUseFeature(entitlements, "support_templates");

  function openTemplate(templateId: SupportTemplateId) {
    if (!canUseTemplates) {
      requestUpgrade("support_templates");
      return;
    }
    navigateTo(pathForSupportTemplate(templateId));
  }

  function openDocument(doc: (typeof PAID_DOCUMENTS)[number]) {
    if (!canUseFeature(entitlements, doc.feature)) {
      requestUpgrade(doc.feature);
      return;
    }
    navigateTo(pathForPaidDocument(doc.id));
  }

  return (
    <div className="no-print">
      <ul
        aria-labelledby="support-templates-heading"
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}
      >
        {SUPPORT_TEMPLATES.map((template) => (
          <li key={template.id} className="card" style={{ position: "relative" }}>
            {!canUseTemplates && (
              <span
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "var(--muted-2)",
                  background: "var(--surface-recessed)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                PAID
              </span>
            )}
            <p className="wizard-eyebrow" style={{ marginBottom: "10px" }}>
              {template.eyebrow}
            </p>
            <strong style={{ display: "block", fontFamily: "var(--heading-font)", fontSize: "1.0625rem", marginBottom: "8px" }}>
              {template.title}
            </strong>
            <span style={{ display: "block", fontSize: "0.84375rem", color: "var(--muted)", lineHeight: 1.55, marginBottom: "16px" }}>
              {template.description}
            </span>
            {canUseTemplates ? (
              <button
                type="button"
                onClick={() => openTemplate(template.id)}
                style={{ minHeight: "auto", minWidth: "auto", padding: 0, border: "none", background: "none", color: "var(--purple)", fontSize: "0.8125rem", fontWeight: 700 }}
              >
                Start →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => requestUpgrade("support_templates")}
                style={{ minHeight: "auto", minWidth: "auto", padding: 0, border: "none", background: "none", color: "var(--muted)", fontSize: "0.8125rem", fontWeight: 700 }}
              >
                Upgrade →
              </button>
            )}
          </li>
        ))}
      </ul>

      <section aria-labelledby="paid-documents-heading" style={{ marginTop: "2rem" }}>
        <h2 id="paid-documents-heading" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
          Documents
        </h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {PAID_DOCUMENTS.map((doc) => {
            const canUse = canUseFeature(entitlements, doc.feature);
            return (
              <li key={doc.id} className="card" style={{ position: "relative" }}>
                {!canUse && (
                  <span
                    style={{
                      position: "absolute",
                      top: "16px",
                      right: "16px",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      color: "var(--muted-2)",
                      background: "var(--surface-recessed)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    PAID
                  </span>
                )}
                <p className="wizard-eyebrow" style={{ marginBottom: "10px" }}>
                  {doc.eyebrow}
                </p>
                <strong style={{ display: "block", fontFamily: "var(--heading-font)", fontSize: "1.0625rem", marginBottom: "8px" }}>
                  {doc.title}
                </strong>
                <span style={{ display: "block", fontSize: "0.84375rem", color: "var(--muted)", lineHeight: 1.55, marginBottom: "16px" }}>
                  {doc.description}
                </span>
                <button
                  type="button"
                  onClick={() => openDocument(doc)}
                  style={{
                    minHeight: "auto",
                    minWidth: "auto",
                    padding: 0,
                    border: "none",
                    background: "none",
                    color: canUse ? "var(--purple)" : "var(--muted)",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                  }}
                >
                  {canUse ? "Start →" : "Upgrade →"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <ArcCrossSell />
    </div>
  );
}

export function SupportTemplatesHubPage() {
  return (
    <>
      <ShellHeader activeId="support-hub" />
      <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "2rem 24px 4rem" }}>
        <div id="top" />
        <header style={{ marginBottom: "1.75rem" }}>
          <p className="wizard-eyebrow" style={{ marginBottom: "8px" }}>
            Support Templates
          </p>
          <h1 style={{ margin: "0 0 6px" }}>Behaviour support plan templates</h1>
          <p style={{ margin: 0, maxWidth: "640px", color: "var(--muted)" }}>
            Structured plan wizards with fixed section order, carried-forward fields and DOCX export.
          </p>
        </header>
        <SupportTemplatesHub />
      </main>
    </>
  );
}
