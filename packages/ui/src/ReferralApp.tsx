import type { TriageTask } from "@pbs/core";
import { useState } from "react";
import "./tokens.css";
import "./print.css";
import { ReferralForm } from "./ReferralForm.js";
import { SourceForm, type SourceResult } from "./SourceForm.js";
import { TriageForm, type TriageResult } from "./TriageForm.js";

/**
 * Standalone shell for document 01 (MD-005): no login, no other tool, no
 * network call — everything here runs client-side against the registry
 * bundled into this build. Submission produces a TriageTask entirely in
 * memory, which then feeds document 02 directly: this is one governed
 * case flowing through two forms, not two standalone tools, so document
 * 02 itself runs under "connected" capabilities (see TriageForm) even
 * though document 01 above it is standalone. Document 03 (the source and
 * consultation register) follows the same "connected" reasoning and is
 * pathway-independent — every RRP classification permits it.
 */
export function ReferralApp() {
  const [task, setTask] = useState<TriageTask | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [sourceResult, setSourceResult] = useState<SourceResult | null>(null);

  const step = !task ? "01" : !triageResult ? "02" : !sourceResult ? "03" : "done";
  const titles: Record<string, string> = {
    "01": "01 — Referral",
    "02": "02 — Practitioner Triage",
    "03": "03 — Source and Consultation Register",
    done: "03 — Source and Consultation Register",
  };

  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1.25rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--purple)", fontWeight: 700, margin: 0 }}>Fracta Flow</p>
        <h1 style={{ margin: "0.25rem 0" }}>{titles[step]}</h1>
        <p className="field-note no-print">
          {step === "01"
            ? "Standalone mode. No account, no other tool, no network call."
            : "Referral review below is quoted from earlier documents — nothing here re-asks it."}
        </p>
      </header>

      {!task && <ReferralForm onSubmitted={setTask} />}
      {task && !triageResult && <TriageForm task={task} onSubmitted={setTriageResult} />}
      {triageResult && !sourceResult && (
        <SourceForm priorFields={triageResult.caseFields} onSubmitted={setSourceResult} />
      )}

      {sourceResult && (
        <pre className="no-print" style={{ background: "#f4f4f4", padding: "1rem", marginTop: "1.5rem" }}>
          {JSON.stringify({ resolvedPathway: triageResult?.resolvedPathway, ...sourceResult }, null, 2)}
        </pre>
      )}
    </main>
  );
}
