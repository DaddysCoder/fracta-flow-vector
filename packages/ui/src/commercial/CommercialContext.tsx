import { VECTOR_BRAND, type Brand } from "@pbs/export";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_HEADING_FONT, resolveExportBrand } from "./brandProfile.js";
import {
  fetchVectorBrandProfile,
  fetchVectorEntitlements,
  startVectorCheckout,
  type VectorPurchase,
} from "./billing.js";
import {
  FREE_ENTITLEMENTS,
  type PaidFeature,
  type VectorEntitlements,
} from "./entitlements.js";

export interface VectorCommercialState {
  entitlements: VectorEntitlements;
  exportBrand: Brand;
  requestUpgrade: (feature: PaidFeature) => void;
}

function defaultUpgrade(feature: PaidFeature) {
  void startVectorCheckout(feature, "monthly").catch((error) => {
    window.dispatchEvent(
      new CustomEvent("vector:billing-error", {
        detail: { feature, error: error instanceof Error ? error.message : "checkout_failed" },
      }),
    );
  });
}

const defaultCommercialState: VectorCommercialState = {
  entitlements: FREE_ENTITLEMENTS,
  exportBrand: VECTOR_BRAND,
  requestUpgrade: defaultUpgrade,
};

const VectorCommercialContext = createContext<VectorCommercialState>(defaultCommercialState);

export interface VectorCommercialProviderProps extends Partial<VectorCommercialState> {
  children: ReactNode;
}

type BillingAttempt =
  | { status: "idle" }
  | { status: "choosing"; feature: PaidFeature }
  | { status: "opening"; feature: PaidFeature; purchase: VectorPurchase }
  | { status: "error"; feature: PaidFeature; purchase: VectorPurchase; code: string };

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function checkoutErrorMessage(code: string) {
  if (code === "billing_not_configured") {
    return "Checkout is temporarily unavailable. Please try again shortly.";
  }
  return "We couldn’t open secure checkout. Please try again.";
}

function purchaseLabel(purchase: VectorPurchase) {
  switch (purchase) {
    case "single_document":
      return "A$5 · One document";
    case "monthly":
      return "A$19 · Monthly";
    case "yearly":
      return "A$180 · Yearly";
  }
}

export function VectorCommercialProvider({
  children,
  entitlements,
  exportBrand: exportBrandOverride,
  requestUpgrade: requestUpgradeOverride,
}: VectorCommercialProviderProps) {
  const [resolvedEntitlements, setResolvedEntitlements] = useState(
    entitlements ?? defaultCommercialState.entitlements,
  );
  const [exportBrand, setExportBrand] = useState<Brand>(exportBrandOverride ?? VECTOR_BRAND);
  const [billingAttempt, setBillingAttempt] = useState<BillingAttempt>({ status: "idle" });

  function requestUpgrade(feature: PaidFeature) {
    if (requestUpgradeOverride) {
      requestUpgradeOverride(feature);
      return;
    }
    setBillingAttempt({ status: "choosing", feature });
  }

  function openCheckout(feature: PaidFeature, purchase: VectorPurchase) {
    setBillingAttempt({ status: "opening", feature, purchase });
    window.dispatchEvent(
      new CustomEvent("vector:billing-start", { detail: { feature, purchase } }),
    );

    void startVectorCheckout(feature, purchase).catch((error) => {
      const code = error instanceof Error ? error.message : "checkout_failed";
      setBillingAttempt({ status: "error", feature, purchase, code });
      window.dispatchEvent(
        new CustomEvent("vector:billing-error", {
          detail: { feature, purchase, error: code },
        }),
      );
    });
  }

  useEffect(() => {
    if (entitlements) {
      setResolvedEntitlements(entitlements);
      return;
    }

    let cancelled = false;

    async function refreshEntitlements(attempts = 1) {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const state = await fetchVectorEntitlements();
          if (cancelled) return;
          setResolvedEntitlements(state.entitlements);
          if (state.entitlements.plan === "paid" || state.entitlements.documentCredits > 0) return;
        } catch {
          if (cancelled) return;
        }
        if (attempt < attempts - 1) await sleep(600 * (attempt + 1));
      }
    }

    const returnedFromCheckout = new URLSearchParams(window.location.search).get("billing") === "success";
    void refreshEntitlements(returnedFromCheckout ? 5 : 1);

    const handleCreditConsumed = () => void refreshEntitlements(1);
    window.addEventListener("vector:document-credit-consumed", handleCreditConsumed);
    return () => {
      cancelled = true;
      window.removeEventListener("vector:document-credit-consumed", handleCreditConsumed);
    };
  }, [entitlements]);

  useEffect(() => {
    if (exportBrandOverride) {
      setExportBrand(exportBrandOverride);
      return;
    }

    let cancelled = false;
    async function refreshBrand() {
      const brand = await resolveExportBrand(resolvedEntitlements);
      if (!cancelled) setExportBrand(brand);
    }

    void refreshBrand();
    window.addEventListener("vector:brand-profile-saved", refreshBrand);
    return () => {
      cancelled = true;
      window.removeEventListener("vector:brand-profile-saved", refreshBrand);
    };
  }, [exportBrandOverride, resolvedEntitlements]);

  // Paid Brand Profile customisation (heading font + accent colour) applies
  // live, app-wide, not just to exports — every heading and focus/required
  // mark on screen derives from these two CSS custom properties.
  useEffect(() => {
    let cancelled = false;
    async function applyBrandToDocument() {
      const root = document.documentElement.style;
      if (!resolvedEntitlements.companyBranding) {
        root.removeProperty("--purple");
        root.removeProperty("--heading-font");
        return;
      }
      try {
        const profile = await fetchVectorBrandProfile();
        if (cancelled) return;
        if (profile?.accentHex) root.setProperty("--purple", `#${profile.accentHex.replace(/^#/, "")}`);
        else root.removeProperty("--purple");
        const font = profile?.headingFont ?? DEFAULT_HEADING_FONT;
        root.setProperty(
          "--heading-font",
          `"${font}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
        );
      } catch {
        if (!cancelled) {
          root.removeProperty("--purple");
          root.removeProperty("--heading-font");
        }
      }
    }

    void applyBrandToDocument();
    window.addEventListener("vector:brand-profile-saved", applyBrandToDocument);
    return () => {
      cancelled = true;
      window.removeEventListener("vector:brand-profile-saved", applyBrandToDocument);
    };
  }, [resolvedEntitlements.companyBranding]);

  const activeFeature = billingAttempt.status === "idle" ? null : billingAttempt.feature;

  return (
    <VectorCommercialContext.Provider
      value={{ entitlements: resolvedEntitlements, exportBrand, requestUpgrade }}
    >
      {children}
      {!requestUpgradeOverride && billingAttempt.status !== "idle" ? (
        <div
          className="no-print"
          role={billingAttempt.status === "error" ? "alert" : "dialog"}
          aria-live={billingAttempt.status === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "1rem",
            zIndex: 1000,
            width: "min(440px, calc(100vw - 2rem))",
            transform: "translateX(-50%)",
            padding: "1rem",
            border: "1px solid var(--border, #d8d8d8)",
            borderRadius: "14px",
            background: "var(--surface, #fff)",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.14)",
          }}
        >
          {billingAttempt.status === "choosing" ? (
            <>
              <strong style={{ display: "block", marginBottom: "0.35rem" }}>
                Choose your Vector access
              </strong>
              <div style={{ fontSize: "0.92rem", marginBottom: "0.8rem" }}>
                {activeFeature === "export"
                  ? "Pay once for this document, or unlock the full paid workspace."
                  : "Unlock the full Vector paid workspace."}
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {activeFeature === "export" ? (
                  <button
                    type="button"
                    onClick={() => openCheckout(activeFeature, "single_document")}
                  >
                    A$5 · One document
                  </button>
                ) : null}
                <button type="button" onClick={() => openCheckout(activeFeature!, "monthly")}>
                  A$19 · Monthly
                </button>
                <button type="button" onClick={() => openCheckout(activeFeature!, "yearly")}>
                  A$180 · Yearly
                </button>
                <button type="button" onClick={() => setBillingAttempt({ status: "idle" })}>
                  Keep using Vector Free
                </button>
              </div>
            </>
          ) : billingAttempt.status === "opening" ? (
            <strong>Opening secure checkout for {purchaseLabel(billingAttempt.purchase)}…</strong>
          ) : (
            <>
              <strong style={{ display: "block" }}>
                {checkoutErrorMessage(billingAttempt.code)}
              </strong>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => openCheckout(billingAttempt.feature, billingAttempt.purchase)}
                >
                  Try again
                </button>
                <button type="button" onClick={() => setBillingAttempt({ status: "idle" })}>
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </VectorCommercialContext.Provider>
  );
}

export function useVectorCommercial(): VectorCommercialState {
  return useContext(VectorCommercialContext);
}
