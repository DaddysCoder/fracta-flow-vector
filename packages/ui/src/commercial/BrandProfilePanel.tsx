import { BrandProfileEditor } from "./BrandProfileEditor.js";
import { canUseFeature } from "./entitlements.js";
import { useVectorCommercial } from "./CommercialContext.js";
import { openVectorBillingPortal } from "./billing.js";

export function BrandProfilePanel() {
  const { entitlements, requestUpgrade } = useVectorCommercial();
  const canBrand = canUseFeature(entitlements, "company_branding");

  if (!canBrand) {
    return (
      <section className="no-print" style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid var(--border)" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Organisation branding</h2>
        <p style={{ margin: "0 0 0.75rem" }}>
          Paid Vector unlocks saved organisation branding on exports.
        </p>
        <button type="button" onClick={() => requestUpgrade("company_branding")}>
          Upgrade for organisation branding
        </button>
      </section>
    );
  }

  return (
    <section className="no-print" style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid var(--border)" }}>
      <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Organisation branding</h2>
      <p style={{ margin: "0 0 0.75rem" }}>
        Applied to every exported DOCX and printed document — referral, triage, register and support
        plan templates all pick this up automatically. Your heading font and accent colour also update
        live across the app the moment you save. Organisation details are commercial metadata only —
        never mixed with participant form content.
      </p>
      <BrandProfileEditor />
      <button type="button" style={{ marginTop: "0.75rem" }} onClick={() => void openVectorBillingPortal()}>
        Manage billing
      </button>
    </section>
  );
}
