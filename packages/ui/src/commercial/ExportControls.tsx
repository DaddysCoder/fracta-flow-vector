import type { Brand } from "@pbs/export";
import { canUseFeature } from "./entitlements.js";
import { useVectorCommercial } from "./CommercialContext.js";

export interface ExportControlsProps {
  renderBlank: (brand: Brand) => Promise<Blob>;
  renderCompleted: (brand: Brand) => Promise<Blob>;
  blankFilename: string;
  completedFilename: string;
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
}: ExportControlsProps) {
  const { entitlements, exportBrand, requestUpgrade } = useVectorCommercial();
  const canExport = canUseFeature(entitlements, "export");

  async function runExport(render: (brand: Brand) => Promise<Blob>, filename: string) {
    if (!canExport) {
      requestUpgrade("export");
      return;
    }

    const blob = await render(exportBrand);
    download(blob, filename);
  }

  function handlePrint() {
    if (!canExport) {
      requestUpgrade("export");
      return;
    }
    window.print();
  }

  const paidLabel = canExport ? "" : "Paid — ";

  return (
    <div className="no-print" style={{ marginBottom: "1.5rem" }} data-vector-plan={entitlements.plan}>
      <button type="button" onClick={() => void runExport(renderBlank, blankFilename)}>
        {paidLabel}Download blank DOCX
      </button>{" "}
      <button type="button" onClick={() => void runExport(renderCompleted, completedFilename)}>
        {paidLabel}Download completed DOCX
      </button>{" "}
      <button type="button" onClick={handlePrint}>
        {paidLabel}Print / save PDF
      </button>
    </div>
  );
}
