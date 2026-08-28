import { BrandProfileEditor } from "./BrandProfileEditor.js";
import { canUseFeature } from "./entitlements.js";
import { useVectorCommercial } from "./CommercialContext.js";
import { openVectorBillingPortal } from "./billing.js";

export function BrandProfilePanel() {
  const { entitlements, requestUpgrade } = useVectorCommercial();
  const canBrand = canUseFeature(entitlements, "company_branding");

  if (!canBrand) {
    return (
      <section className="card no-print">
        <h2 className="section-title">Organisation branding</h2>
        <p style={{ margin: "0 0 1rem", color: "var(--muted)" }}>
          Paid Vector unlocks your logo, organisation name, heading font and brand colour on every
          exported document.
        </p>
        <button type="button" className="primary" onClick={() => requestUpgrade("company_branding")}>
          Upgrade for organisation branding
        </button>
      </section>
    );
  }

  return (
    <div className="no-print">
      <BrandProfileEditor />
      <p className="field-note" style={{ marginTop: "1.25rem" }}>
        Organisation details are commercial metadata only — never mixed with participant form content.
      </p>
      <button type="button" style={{ marginTop: "0.5rem" }} onClick={() => void openVectorBillingPortal()}>
        Manage billing
      </button>
    </div>
  );
}
