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
    description: "Hold restrictive practice safely while fuller assessment continues.",
  },
  {
    id: "comprehensive-behaviour-support-plan",
    title: "Comprehensive Behaviour Support Plan",
    description: "Full plan informed by behaviour support assessment including FBA.",
  },
];

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
      className="no-print"
      style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid var(--border, #e5e5e5)" }}
    >
      <h2 id="support-templates-heading" style={{ marginTop: 0, fontSize: "1rem" }}>
        Support Templates
      </h2>
      <p style={{ margin: "0 0 1rem" }}>
        Three paid behaviour support plan templates. Content stays in this browser&apos;s session storage and is not
        sent to WHATBIT servers.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
        {SUPPORT_TEMPLATES.map((template) => (
          <li
            key={template.id}
            style={{ padding: "0.75rem", border: "1px solid var(--border, #e5e5e5)", borderRadius: "8px" }}
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
    </section>
  );
}

export function SupportTemplatesHubPage() {
  const { entitlements, requestUpgrade } = useVectorCommercial();
  const canUseTemplates = canUseFeature(entitlements, "support_templates");

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
      {!canUseTemplates ? (
        <div className="support-template-gate" style={{ border: "1px solid #e5e5e5", borderRadius: "12px", padding: "1.5rem" }}>
          <p>Support Templates require Vector Paid.</p>
          <button type="button" className="primary" onClick={() => requestUpgrade("support_templates")}>
            Upgrade to unlock
          </button>
        </div>
      ) : (
        <SupportTemplatesHub />
      )}
      <p className="no-print" style={{ marginTop: "1.5rem" }}>
        <a href="/referral">← Back to Vector forms</a>
      </p>
    </main>
  );
}
