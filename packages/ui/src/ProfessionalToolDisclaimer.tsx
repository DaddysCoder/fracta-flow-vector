/**
 * Small, muted-text disclaimer for forms and assessments with clinical,
 * behaviour-support, restrictive-practices, risk or regulatory
 * significance. Placed unobtrusively in the info area — never blocks or
 * interrupts submission.
 */
export function ProfessionalToolDisclaimer() {
  return (
    <p className="field-note vector-professional-disclaimer" style={{ marginTop: "0.5rem" }}>
      Professional tool only. This resource supports, but does not replace, practitioner judgement,
      appropriate assessment, organisational procedures or current regulatory requirements.
    </p>
  );
}
