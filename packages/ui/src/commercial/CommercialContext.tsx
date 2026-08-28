import { FRACTA_FLOW_BRAND, type Brand } from "@pbs/export";
import { createContext, useContext, type ReactNode } from "react";
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

const defaultCommercialState: VectorCommercialState = {
  entitlements: FREE_ENTITLEMENTS,
  exportBrand: FRACTA_FLOW_BRAND,
  requestUpgrade: (feature) => {
    window.dispatchEvent(
      new CustomEvent("vector:upgrade-requested", {
        detail: { feature },
      }),
    );
  },
};

const VectorCommercialContext = createContext<VectorCommercialState>(defaultCommercialState);

export interface VectorCommercialProviderProps extends Partial<VectorCommercialState> {
  children: ReactNode;
}

export function VectorCommercialProvider({
  children,
  entitlements = defaultCommercialState.entitlements,
  exportBrand = defaultCommercialState.exportBrand,
  requestUpgrade = defaultCommercialState.requestUpgrade,
}: VectorCommercialProviderProps) {
  return (
    <VectorCommercialContext.Provider value={{ entitlements, exportBrand, requestUpgrade }}>
      {children}
    </VectorCommercialContext.Provider>
  );
}

export function useVectorCommercial(): VectorCommercialState {
  return useContext(VectorCommercialContext);
}
