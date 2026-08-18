import type { TriageTask } from "@pbs/core";
import { useState } from "react";
import "./tokens.css";
import "./print.css";
import { BsaForm, type BsaResult } from "./BsaForm.js";
import { ReferralForm } from "./ReferralForm.js";
import { SourceForm, type SourceResult } from "./SourceForm.js";
import { TriageForm, type TriageResult } from "./TriageForm.js";

/**
 * Standalone shell for all four documents built so far (MD-005/MD-006):
 * no login, no other tool, no network call — everything here runs
 * client-side against the registry bundled into this build. Each form
 * runs under CAPABILITIES.standalone, including 02-04 despite being
 * chained here in one session: cross-document prefill is off, so quoted
 * fields fall back to "Not yet available" exactly as they would if a
 * practitioner opened any one of these forms on its own, with no earlier
 * document's data available at all. This is deliberate — the staged spec
 * requires every document to work standalone before connected mode is
 * turned on uniformly in a later stage (see CONTRADICTIONS.md #5).
 */
export function ReferralApp() {
  const [task, setTask] = useState<TriageTask | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [sourceResult, setSourceResult] = useState<SourceResult | null>(null);
  const [bsaResult, setBsaResult] = useState<BsaResult | null>(null);

  const step = !task ? "01" : !triageResult ? "02" : !sourceResult ? "03" : !bsaResult ? "04" : "done";
  const titles: Record<string, string> = {
    "01": "01 — Referral",
    "02": "02 — Practitioner Triage",
    "03": "03 — Source and Consultation Register",
    "04": "04 — Combined BSA/FBA",
    done: "04 — Combined BSA/FBA",
  };

  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1.25rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--purple)", fontWeight: 700, margin: 0 }}>Fracta Flow</p>
        <h1 style={{ margin: "0.25rem 0" }}>{titles[step]}</h1>
        <p className="field-note no-print">
          {step === "01"
            ? "Standalone mode. No account, no other tool, no network call."
            : "Quoted fields below are read-only and show \"Not yet available\" in this standalone build."}
        </p>
      </header>

      {!task && <ReferralForm onSubmitted={setTask} />}
      {task && !triageResult && <TriageForm task={task} onSubmitted={setTriageResult} />}
      {triageResult && !sourceResult && (
        <SourceForm priorFields={triageResult.caseFields} onSubmitted={setSourceResult} />
      )}
      {triageResult && sourceResult && !bsaResult && (
        <BsaForm
          priorFields={sourceResult.caseFields}
          pathway={triageResult.resolvedPathway.pathway}
          onSubmitted={setBsaResult}
        />
      )}

      {bsaResult && (
        <pre className="no-print" style={{ background: "#f4f4f4", padding: "1rem", marginTop: "1.5rem" }}>
          {JSON.stringify(
            { resolvedPathway: triageResult?.resolvedPathway, ...bsaResult, approvedGates: [...bsaResult.approvedGates] },
            null,
            2,
          )}
        </pre>
      )}
    </main>
  );
}
