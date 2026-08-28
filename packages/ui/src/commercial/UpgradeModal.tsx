import type { PaidFeature } from "./entitlements.js";
import type { VectorPurchase } from "./billing.js";

interface UpgradeCopy {
  headline: string;
  body: string;
  features: string[];
  /** Per the Vector Paid reference: A$5/document only makes sense where a
   * single document purchase actually unlocks something — export. It must
   * never be offered as a way to unlock the whole paid workspace. */
  oneOffAvailable: boolean;
}

const UPGRADE_COPY: Record<PaidFeature, UpgradeCopy> = {
  export: {
    headline: "Unlock document export",
    body: "Export every document as DOCX, or print/save as PDF with your organisation's branding applied automatically.",
    features: [
      "DOCX export on every document",
      "Print / save as PDF",
      "Your heading font and brand colour applied automatically",
      "Support Templates and every other Paid tool",
    ],
    oneOffAvailable: true,
  },
  company_branding: {
    headline: "Add your organisation's branding",
    body: "Your logo, organisation name, heading font and brand colour applied automatically to every exported document.",
    features: [
      "Logo and organisation name on exports",
      "Choose your heading font and brand colour",
      "Applies across every document, set once",
      "DOCX export and Print / save as PDF on every document",
    ],
    oneOffAvailable: false,
  },
  support_templates: {
    headline: "Unlock Support Templates",
    body: "One Behaviour Support Plan wizard that covers every case, with fields carried forward automatically.",
    features: [
      "Full Behaviour Support Plan wizard, RRP included",
      "Fields carried forward automatically",
      "Your heading font and brand colour on every export",
      "DOCX export and Print / save as PDF",
    ],
    oneOffAvailable: false,
  },
  rrp_assessment: {
    headline: "Unlock RRP Assessment",
    body: "Capture every regulated restrictive practice in one structured assessment, kept separate from the reduction plan.",
    features: [
      "Full RRP Assessment across every practice type",
      "DOCX export and Print / save as PDF",
      "Your heading font and brand colour applied automatically",
      "Included with Support Templates and every other Paid document",
    ],
    oneOffAvailable: false,
  },
  support_letter: {
    headline: "Unlock Support Letter",
    body: "A funding recommendation letter with functional impact, recommended supports and an itemised quote for behaviour support.",
    features: [
      "Full Support Letter with live-calculating funding quote",
      "DOCX export and Print / save as PDF",
      "Your heading font and brand colour applied automatically",
      "Included with Support Templates and every other Paid document",
    ],
    oneOffAvailable: false,
  },
  progress_report: {
    headline: "Unlock Progress Report",
    body: "Summarise plan progress for an NDIS plan review, sharing sections with your Support Letter.",
    features: [
      "Full Progress Report with strategies and goal tracking",
      "DOCX export and Print / save as PDF",
      "Your heading font and brand colour applied automatically",
      "Included with Support Templates and every other Paid document",
    ],
    oneOffAvailable: false,
  },
};

interface BillingTierDef {
  v: VectorPurchase;
  label: string;
  price: string;
  per: string;
  note: string;
}

const BILLING_TIERS: BillingTierDef[] = [
  { v: "monthly", label: "Monthly", price: "A$19", per: "/month", note: "Full access, cancel anytime." },
  { v: "yearly", label: "Annual", price: "A$180", per: "/year", note: "Full paid access." },
  { v: "single_document", label: "One-off", price: "A$5", per: "/document", note: "No subscription." },
];

function checkoutErrorMessage(code: string): string {
  if (code === "billing_not_configured") {
    return "Checkout is temporarily unavailable. Please try again shortly.";
  }
  return "We couldn't open secure checkout. Please try again.";
}

export interface UpgradeModalProps {
  feature: PaidFeature;
  purchase: VectorPurchase;
  status: "choosing" | "opening" | "error";
  errorCode?: string;
  onSelectPurchase: (purchase: VectorPurchase) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/** The approved Vector Paid paywall — one shared layout, headline/body/
 * feature-list swapped per triggering feature (see `Vector Paywall
 * Reference.dc.html`). Replaces the old inline tier-button list. */
export function UpgradeModal({
  feature,
  purchase,
  status,
  errorCode,
  onSelectPurchase,
  onConfirm,
  onClose,
}: UpgradeModalProps) {
  const copy = UPGRADE_COPY[feature];
  const tiers = copy.oneOffAvailable ? BILLING_TIERS : BILLING_TIERS.filter((t) => t.v !== "single_document");
  const selectedTier = tiers.find((t) => t.v === purchase) ?? tiers[0]!;
  const ctaLabel = selectedTier.v === "single_document" ? "Unlock this document" : "Upgrade to Vector Paid";

  return (
    <div className="vector-upgrade-overlay no-print" onClick={onClose}>
      <div
        className="vector-upgrade-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vector-upgrade-headline"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="vector-upgrade-eyebrow">Vector Paid</p>
        <h2 id="vector-upgrade-headline" className="vector-upgrade-headline">
          {copy.headline}
        </h2>
        <p className="vector-upgrade-body">{copy.body}</p>

        <ul className="vector-upgrade-features">
          {copy.features.map((label) => (
            <li key={label}>
              <span className="vector-upgrade-check" aria-hidden="true">
                ✓
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        {status === "error" ? (
          <>
            <p role="alert" className="vector-upgrade-error">
              {checkoutErrorMessage(errorCode ?? "checkout_failed")}
            </p>
            <button type="button" className="primary vector-upgrade-cta" onClick={onConfirm}>
              Try again
            </button>
            <button type="button" className="vector-upgrade-later" onClick={onClose}>
              Dismiss
            </button>
          </>
        ) : (
          <>
            <div className="vector-upgrade-tiers" role="tablist" aria-label="Billing option">
              {tiers.map((tier) => (
                <button
                  key={tier.v}
                  type="button"
                  role="tab"
                  aria-selected={tier.v === selectedTier.v}
                  className={`vector-upgrade-tier${tier.v === selectedTier.v ? " is-selected" : ""}`}
                  onClick={() => onSelectPurchase(tier.v)}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            <div className="vector-upgrade-price-block">
              <div className="vector-upgrade-price">
                {selectedTier.price}
                <span>{selectedTier.per}</span>
              </div>
              <div className="vector-upgrade-price-note">{selectedTier.note}</div>
            </div>

            <button
              type="button"
              className="primary vector-upgrade-cta"
              disabled={status === "opening"}
              onClick={onConfirm}
            >
              {status === "opening" ? "Opening secure checkout…" : ctaLabel}
            </button>
            <button type="button" className="vector-upgrade-later" onClick={onClose}>
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
