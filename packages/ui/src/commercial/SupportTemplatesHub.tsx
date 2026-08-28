import { canUseFeature } from "./entitlements.js";
import { useVectorCommercial } from "./CommercialContext.js";
import {
  pathForSupportTemplate,
  SUPPORT_TEMPLATE_ROUTES,
  type SupportTemplateId,
} from "../routing.js";

const SUPPORT_TEMPLATES: Array<{
  id: SupportTemplateId;
  title: string;
  description: string;
}> = [
  {
    id: "behaviour-support-plan",
    title: "Behaviour Support Plan",
    description: "For participants without regulated restrictive practice.",
  },
  {
    id: "interim-behaviour-support-plan",
    title: "Interim Behaviour Support Plan",
    description: "Supports immediate needs and risk management while fuller assessment continues. A completed FBA is not required to start.",
  },
  {
    id: "comprehensive-behaviour-support-plan",
    title: "Comprehensive Behaviour Support Plan",
    description: "Full plan informed by behaviour support assessment including FBA.",
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

export function SupportTemplatesHub() {
  const { entitlements, requestUpgrade } = useVectorCommercial();
  const canUseTemplates = canUseFeature(entitlements, "support_templates");

  function openTemplate(templateId: SupportTemplateId) {
    if (!canUseTemplates) {
      requestUpgrade("support_templates");
      return;
    }
    const nextPath = pathForSupportTemplate(templateId);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

  return (
    <section
      aria-labelledby="support-templates-heading"
      className="card no-print"
      style={{ marginBottom: "2rem" }}
    >
      <h2 id="support-templates-heading" style={{ marginTop: 0, fontSize: "1rem" }}>
        Support Templates
      </h2>
      <p style={{ margin: "0 0 1rem" }}>
        One general Behaviour Support Plan template, plus the formal Interim and Comprehensive NDIS BSP templates.
        Content stays in this browser&apos;s session storage and is not sent to WHATBIT servers.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
        {SUPPORT_TEMPLATES.map((template) => (
          <li
            key={template.id}
            className="card card-recessed"
            style={{ padding: "0.75rem" }}
          >
            <strong style={{ display: "block" }}>{template.title}</strong>
            <span style={{ display: "block", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {template.description}
            </span>
            {canUseTemplates ? (
              <button type="button" style={{ marginTop: "0.5rem" }} onClick={() => openTemplate(template.id)}>
                Open template
              </button>
            ) : (
              <button type="button" style={{ marginTop: "0.5rem" }} onClick={() => requestUpgrade("support_templates")}>
                Upgrade to unlock Support Templates
              </button>
            )}
          </li>
        ))}
      </ul>
      {canUseTemplates ? (
        <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
          <a href={SUPPORT_TEMPLATE_ROUTES.hub}>View all Support Templates</a>
        </p>
      ) : null}
      <ArcCrossSell />
    </section>
  );
}

export function SupportTemplatesHubPage() {
  return (
    <main style={{ maxWidth: "820px", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--purple)", fontWeight: 800, letterSpacing: "0.04em", margin: 0 }}>VECTOR</p>
        <h1 style={{ margin: "0.25rem 0 0.5rem" }}>Support Templates</h1>
        <p style={{ margin: 0 }}>
          Paid behaviour support plan templates for Vector. All template content stays on this device in session
          storage.
        </p>
      </header>
      <SupportTemplatesHub />
      <p className="no-print" style={{ marginTop: "1.5rem" }}>
        <a href="/referral">← Back to Vector forms</a>
      </p>
    </main>
  );
}
