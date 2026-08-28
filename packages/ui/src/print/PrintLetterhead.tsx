import "./reportPrint.css";

export interface PrintLetterheadProps {
  docTitle: string;
}

/**
 * Print-only letterhead (org logo placeholder top-left, doc title
 * top-right) for the three report documents — invisible on screen, shown
 * only under `@media print` via reportPrint.css. The screen already has
 * its own eyebrow/h1 (tokens.css's design language); this is the
 * separate, plain print presentation from `Vector Reports Preview
 * (print).dc.html`, not a duplicate of the screen header.
 */
export function PrintLetterhead({ docTitle }: PrintLetterheadProps) {
  return (
    <div className="print-only print-hdr" aria-hidden="true">
      <div className="print-logo">Org logo</div>
      <div className="print-doctitle">{docTitle}</div>
    </div>
  );
}
