import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ReferralApp } from "./ReferralApp.js";
import { VectorCommercialProvider } from "./commercial/CommercialContext.js";

const container = document.getElementById("root");
if (!container) throw new Error("missing #root");

createRoot(container).render(
  <StrictMode>
    <VectorCommercialProvider>
      <ReferralApp />
    </VectorCommercialProvider>
  </StrictMode>,
);
