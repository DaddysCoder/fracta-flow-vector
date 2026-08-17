import type { TriageTask } from "@pbs/core";
import { useState } from "react";
import "./tokens.css";
import "./print.css";
import { ReferralForm } from "./ReferralForm.js";
import { TriageForm, type TriageResult } from "./TriageForm.js";

/**
 * Standalone shell for document 01 (MD-005): no login, no other tool, no
 * network call — everything here runs client-side against the registry
 * bundled into this build. Submission produces a TriageTask entirely in
 * memory, which then feeds document 02 directly: this is one governed
 * case flowing through two forms, not two standalone tools, so document
 * 02 itself runs under "connected" capabilities (see TriageForm) even
 * though document 01 above it is standalone.
 */
export function ReferralApp() {
  const [task, setTask] = useState<TriageTask | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1.25rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--purple)", fontWeight: 700, margin: 0 }}>Fracta Flow</p>
        <h1 style={{ margin: "0.25rem 0" }}>{task ? "02 — Practitioner Triage" : "01 — Referral"}</h1>
        <p className="field-note no-print">
          {task
            ? "Referral review below is quoted from document 01 — nothing here re-asks it."
            : "Standalone mode. No account, no other tool, no network call."}
        </p>
      </header>

      {!task && <ReferralForm onSubmitted={setTask} />}
      {task && !triageResult && <TriageForm task={task} onSubmitted={setTriageResult} />}

      {triageResult && (
        <pre className="no-print" style={{ background: "#f4f4f4", padding: "1rem", marginTop: "1.5rem" }}>
          {JSON.stringify(triageResult, null, 2)}
        </pre>
      )}
    </main>
  );
}
