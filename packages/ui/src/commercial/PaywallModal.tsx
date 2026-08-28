import { useState } from "react";
import type { VectorPurchase } from "./billing.js";
import type { PaidFeature } from "./entitlements.js";

interface FeatureCopy {
  headline: string;
  body: string;
  bullets: string[];
}

const FEATURE_COPY: Record<PaidFeature, FeatureCopy> = {
  export: {
    headline: "Unlock DOCX export and print",
    body: "Download blank or completed documents, or print/save as PDF, any time you need a copy outside this device.",
    bullets: ["Download blank and completed DOCX for every document", "Print / save as PDF from any form"],
  },
  company_branding: {
    headline: "Unlock organisation branding",
    body: "Put your organisation's name, heading font and accent colour on every export, automatically.",
    bullets: ["Your organisation name on every export", "Saved brand profile applied without re-entering it"],
  },
  support_templates: {
    headline: "Unlock Support Templates",
    body: "Behaviour Support Plan, Interim BSP and Comprehensive BSP templates, ready to fill in and export.",
    bullets: ["Behaviour Support Plan, Interim BSP and Comprehensive BSP", "RRP Assessment and Progress Report documents"],
  },
};

const COMMON_BULLETS = [
  "Custom heading font and accent colour, applied to every exported document",
  "Smart templates — downloaded with setup instructions to embed on your site or connect your practice software",
];

type BillingTier = "monthly" | "annual" | "one_off";

const TIER_TO_PURCHASE: Record<BillingTier, VectorPurchase> = {
  monthly: "monthly",
  annual: "yearly",
  one_off: "single_document",
};

const TIERS: Array<{ id: BillingTier; label: string; price: string; note: string }> = [
  { id: "monthly", label: "Monthly", price: "$19/mo", note: "" },
  { id: "annual", label: "Annual", price: "$180/yr", note: "2 months free" },
  { id: "one_off", label: "One-off", price: "$5/document", note: "no subscription" },
];

export interface PaywallModalProps {
  feature: PaidFeature;
  onConfirm: (purchase: VectorPurchase) => void;
  onDismiss: () => void;
}

export function PaywallModal({ feature, onConfirm, onDismiss }: PaywallModalProps) {
  const [tier, setTier] = useState<BillingTier>("monthly");
  const copy = FEATURE_COPY[feature];
  const selected = TIERS.find((t) => t.id === tier)!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-heading"
      className="no-print"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(17, 17, 17, 0.4)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "var(--paper, #fff)",
          borderRadius: "12px",
          padding: "1.5rem",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 20px 40px rgba(17,17,17,0.16)",
        }}
      >
        <h2 id="paywall-heading" style={{ marginTop: 0 }}>
          {copy.headline}
        </h2>
        <p>{copy.body}</p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1rem" }}>
          {[...copy.bullets, ...COMMON_BULLETS].map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <div role="radiogroup" aria-label="Billing tier" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tier === t.id}
              onClick={() => setTier(t.id)}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "8px",
                border: tier === t.id ? "2px solid var(--purple)" : "1px solid var(--muted)",
                background: tier === t.id ? "color-mix(in srgb, var(--purple) 10%, white)" : "transparent",
                cursor: "pointer",
              }}
            >
              <strong style={{ display: "block", fontSize: "0.875rem" }}>{t.label}</strong>
              <span style={{ display: "block", fontSize: "0.75rem" }}>{t.note}</span>
            </button>
          ))}
        </div>

        <p style={{ fontWeight: 700, margin: "0 0 1rem" }}>{selected.price}</p>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="primary" onClick={() => onConfirm(TIER_TO_PURCHASE[tier])}>
            {tier === "one_off" ? "Unlock this document" : "Upgrade to Vector Paid"}
          </button>
          <button type="button" onClick={onDismiss}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
