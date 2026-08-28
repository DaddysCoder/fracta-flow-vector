import type { Brand } from "@pbs/export";
import { consumeVectorDocumentCredit } from "./billing.js";
import { canUseFeature } from "./entitlements.js";
import { useVectorCommercial } from "./CommercialContext.js";

export interface ExportControlsProps {
  renderBlank: (brand: Brand) => Promise<Blob>;
  renderCompleted: (brand: Brand) => Promise<Blob>;
  blankFilename: string;
  completedFilename: string;
  showBlank?: boolean;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportControls({
  renderBlank,
  renderCompleted,
  blankFilename,
  completedFilename,
  showBlank = true,
}: ExportControlsProps) {
  const { entitlements, exportBrand, requestUpgrade } = useVectorCommercial();
  const canExport = canUseFeature(entitlements, "export");
  const usesDocumentCredit = entitlements.plan !== "paid" && entitlements.documentCredits > 0;

  async function consumeCreditIfNeeded() {
    if (!usesDocumentCredit) return;
    await consumeVectorDocumentCredit();
    window.dispatchEvent(new CustomEvent("vector:document-credit-consumed"));
  }

  async function runExport(render: (brand: Brand) => Promise<Blob>, filename: string) {
    if (!canExport) {
      requestUpgrade("export");
      return;
    }

    const blob = await render(exportBrand);
    await consumeCreditIfNeeded();
    download(blob, filename);
  }

  async function handlePrint() {
    if (!canExport) {
      requestUpgrade("export");
      return;
    }
    await consumeCreditIfNeeded();
    window.print();
  }

  const paidLabel = canExport ? "" : "Paid — ";

  return (
    <div className="vector-export-controls no-print" data-vector-plan={entitlements.plan}>
      {usesDocumentCredit ? (
        <div className="vector-export-credit">
          {entitlements.documentCredits} document export{entitlements.documentCredits === 1 ? "" : "s"} available
        </div>
      ) : null}
      {showBlank ? (
        <button type="button" onClick={() => void runExport(renderBlank, blankFilename)}>
          {paidLabel}Download blank DOCX
        </button>
      ) : null}
      <button type="button" onClick={() => void runExport(renderCompleted, completedFilename)}>
        {paidLabel}Download completed DOCX
      </button>
      <button type="button" onClick={() => void handlePrint()}>
        {paidLabel}Print / save PDF
      </button>
    </div>
  );
}
