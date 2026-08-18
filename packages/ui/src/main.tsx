import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { VectorApp } from "./VectorApp.js";

const container = document.getElementById("root");
if (!container) throw new Error("missing #root");

createRoot(container).render(
  <StrictMode>
    <VectorApp />
  </StrictMode>,
);
