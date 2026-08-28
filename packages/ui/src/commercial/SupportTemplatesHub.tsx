import { canUseFeature } from "./entitlements.js";
import { useVectorCommercial } from "./CommercialContext.js";

const SUPPORT_TEMPLATES = [
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
] as const;

export function SupportTemplatesHub() {
  const { entitlements, requestUpgrade } = useVectorCommercial();
  const canUseTemplates = canUseFeature(entitlements, "support_templates");

  return (
    <section
      aria-labelledby="support-templates-heading"
      className="no-print"
      style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid var(--border)" }}
    >
      <h2 id="support-templates-heading" style={{ marginTop: 0, fontSize: "1rem" }}>
        Support Templates
      </h2>
      <p style={{ margin: "0 0 1rem" }}>
        Three paid behaviour support plan templates are being integrated into Vector. They remain
        client-side and require Vector Paid.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
        {SUPPORT_TEMPLATES.map((template) => (
          <li
            key={template.id}
            style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "8px" }}
          >
            <strong style={{ display: "block" }}>{template.title}</strong>
            <span style={{ display: "block", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {template.description}
            </span>
            {canUseTemplates ? (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>Integration in progress.</p>
            ) : (
              <button type="button" style={{ marginTop: "0.5rem" }} onClick={() => requestUpgrade("support_templates")}>
                Upgrade to unlock Support Templates
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
