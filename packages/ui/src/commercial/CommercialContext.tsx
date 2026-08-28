import { VECTOR_BRAND, type Brand } from "@pbs/export";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveExportBrand } from "./brandProfile.js";
import { fetchVectorEntitlements, startVectorCheckout } from "./billing.js";
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
  void startVectorCheckout(feature).catch((error) => {
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
  | { status: "opening"; feature: PaidFeature }
  | { status: "error"; feature: PaidFeature; code: string };

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function checkoutErrorMessage(code: string) {
  if (code === "billing_not_configured") {
    return "Checkout is temporarily unavailable. Please try again shortly.";
  }
  return "We couldn’t open secure checkout. Please try again.";
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

    setBillingAttempt({ status: "opening", feature });
    window.dispatchEvent(new CustomEvent("vector:billing-start", { detail: { feature } }));

    void startVectorCheckout(feature).catch((error) => {
      const code = error instanceof Error ? error.message : "checkout_failed";
      setBillingAttempt({ status: "error", feature, code });
      window.dispatchEvent(
        new CustomEvent("vector:billing-error", {
          detail: { feature, error: code },
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
    const returnedFromCheckout = new URLSearchParams(window.location.search).get("billing") === "success";

    void (async () => {
      const attempts = returnedFromCheckout ? 5 : 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const state = await fetchVectorEntitlements();
          if (cancelled) return;
          setResolvedEntitlements(state.entitlements);
          if (state.entitlements.plan === "paid") return;
        } catch {
          if (cancelled) return;
        }
        if (attempt < attempts - 1) await sleep(600 * (attempt + 1));
      }
    })();

    return () => {
      cancelled = true;
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

  return (
    <VectorCommercialContext.Provider
      value={{ entitlements: resolvedEntitlements, exportBrand, requestUpgrade }}
    >
      {children}
      {!requestUpgradeOverride && billingAttempt.status !== "idle" ? (
        <div
          className="no-print"
          role={billingAttempt.status === "error" ? "alert" : "status"}
          aria-live={billingAttempt.status === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          style={{
            position: "fixed",
            left: "50%",
            bottom: "1rem",
            zIndex: 1000,
            width: "min(420px, calc(100vw - 2rem))",
            transform: "translateX(-50%)",
            padding: "0.875rem 1rem",
            border: "1px solid var(--border, #d8d8d8)",
            borderRadius: "12px",
            background: "var(--surface, #fff)",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.14)",
          }}
        >
          {billingAttempt.status === "opening" ? (
            <strong>Opening secure checkout…</strong>
          ) : (
            <>
              <strong style={{ display: "block" }}>
                {checkoutErrorMessage(billingAttempt.code)}
              </strong>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button type="button" onClick={() => requestUpgrade(billingAttempt.feature)}>
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
