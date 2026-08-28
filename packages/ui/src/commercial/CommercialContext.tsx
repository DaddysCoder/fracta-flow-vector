import { VECTOR_BRAND, type Brand } from "@pbs/export";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function VectorCommercialProvider({
  children,
  entitlements,
  exportBrand = defaultCommercialState.exportBrand,
  requestUpgrade = defaultCommercialState.requestUpgrade,
}: VectorCommercialProviderProps) {
  const [resolvedEntitlements, setResolvedEntitlements] = useState(
    entitlements ?? defaultCommercialState.entitlements,
  );

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

  return (
    <VectorCommercialContext.Provider
      value={{ entitlements: resolvedEntitlements, exportBrand, requestUpgrade }}
    >
      {children}
    </VectorCommercialContext.Provider>
  );
}

export function useVectorCommercial(): VectorCommercialState {
  return useContext(VectorCommercialContext);
}
