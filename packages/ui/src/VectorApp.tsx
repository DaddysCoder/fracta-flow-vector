import {
  resolvePathway,
  type FieldEntry,
  type InterimSafeguard,
  type ResolvedPathway,
  type RrpClassification,
  type TriageTask,
} from "@pbs/core";
import { useMemo, useState } from "react";
import "./tokens.css";
import "./print.css";
import { AssessmentForm } from "./AssessmentForm.js";
import { CaptureForm } from "./CaptureForm.js";
import { withoutCaptureEntries } from "./capture.js";
import { ComprehensiveBspForm } from "./ComprehensiveBspForm.js";
import { documentSteps } from "./flow.js";
import { InterimBspForm } from "./InterimBspForm.js";
import { NoRpBspForm } from "./NoRpBspForm.js";
import { ReferralForm } from "./ReferralForm.js";
import { SourceForm } from "./SourceForm.js";
import { StrategyForm } from "./StrategyForm.js";
import { toPathwayPermissions } from "./registryAdapter.js";
import { TriageForm } from "./TriageForm.js";

/**
 * The Vector shell: Referral → Triage → Sources → Assessment →
 * Strategies → BSP → release, with which documents are reachable decided
 * by the RRP classification's own permits/forbids/blocks in the registry
 * (`pathways.json`), not by a hardcoded three-way switch.
 *
 * Standalone first (MD-005/MD-006, CONTRADICTIONS.md #5): every document
 * runs under `CAPABILITIES.standalone`, so quoted values render "Not yet
 * available" rather than being prefilled across documents. Connected mode
 * is a later, uniform deployment-mode switch, not something a form
 * decides for itself. The in-memory case record below is what a
 * connected deployment will resolve against — it is passed to each
 * document, and each document still chooses to ignore it in standalone.
 *
 * Document 05's rows are deliberately kept out of that record
 * (`withoutCaptureEntries`): a standalone capture log must never alter
 * the Assessment / FBA Record.
 */
export function VectorApp() {
  const [task, setTask] = useState<TriageTask | null>(null);
  const [caseFields, setCaseFields] = useState<FieldEntry[]>([]);
  const [captureFields, setCaptureFields] = useState<FieldEntry[]>([]);
  const [approvedGates, setApprovedGates] = useState<ReadonlySet<string>>(new Set());
  const [safeguards, setSafeguards] = useState<InterimSafeguard[]>([]);
  const [classification, setClassification] = useState<RrpClassification | null>(null);
  const [open, setOpen] = useState<string>("01");
  const [done, setDone] = useState<string[]>([]);

  const resolved: ResolvedPathway | null = useMemo(
    () =>
      classification
        ? resolvePathway(classification, toPathwayPermissions(classification), approvedGates)
        : null,
    [classification, approvedGates],
  );

  const steps = resolved ? documentSteps(resolved) : [];

  function complete(id: string, fields?: FieldEntry[]) {
    if (fields) setCaseFields(withoutCaptureEntries(fields));
    setDone((d) => (d.includes(id) ? d : [...d, id]));
  }

  return (
    <main style={{ maxWidth: "820px", margin: "0 auto", padding: "2rem 1.25rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--purple)", fontWeight: 700, margin: 0 }}>Fracta Flow — Vector</p>
        <h1 style={{ margin: "0.25rem 0" }}>
          {open} — {steps.find((s) => s.id === open)?.title ?? documentTitle(open)}
        </h1>
        <p className="field-note no-print">
          Standalone mode. No account, no other tool, no network call.
          {resolved && ` Pathway: ${resolved.pathway}.`}
        </p>
      </header>

      {resolved && (
        <nav className="no-print" aria-label="Documents" style={{ marginBottom: "1.5rem" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {steps.map((step) => {
              const reachable = step.reachability === "permitted";
              return (
                <li key={step.id} style={{ marginBottom: "0.2rem" }}>
                  <button
                    type="button"
                    disabled={!reachable}
                    aria-current={open === step.id ? "page" : undefined}
                    onClick={() => setOpen(step.id)}
                    style={{ minWidth: "22rem", textAlign: "left" }}
                  >
                    {step.id} {step.title}
                    {done.includes(step.id) ? " · done" : ""}
                    {!reachable ? ` · ${step.reachability}` : ""}
                  </button>
                  {step.note && <span className="field-note"> {step.note}</span>}
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {open === "01" && task && (
        <CompletedNote id="01" title="Referral" />
      )}

      {open === "02" && done.includes("02") && (
        <CompletedNote id="02" title="Practitioner Triage" />
      )}

      {open === "01" && !task && (
        <ReferralForm
          onSubmitted={(t) => {
            setTask(t);
            setCaseFields(t.fields);
            complete("01");
            setOpen("02");
          }}
        />
      )}

      {open === "02" && task && !done.includes("02") && (
        <TriageForm
          task={task}
          onSubmitted={(result) => {
            setCaseFields(result.caseFields);
            const value = result.caseFields.find((f) => f.fieldId === "triage.rrp_status")?.value;
            setClassification((value as RrpClassification) ?? "none");
            complete("02");
            setOpen("03");
          }}
        />
      )}

      {open === "03" && (
        <SourceForm
          priorFields={caseFields}
          onSubmitted={(result) => {
            complete("03", result.caseFields);
            setOpen("04");
          }}
        />
      )}

      {open === "04" && resolved && (
        <AssessmentForm
          priorFields={caseFields}
          pathway={resolved.pathway}
          approvedGates={approvedGates}
          onSubmitted={(result) => {
            setApprovedGates(result.approvedGates);
            complete("04", result.caseFields);
          }}
        />
      )}

      {open === "05" && (
        <CaptureForm
          onSubmitted={(result) => {
            setCaptureFields(result.captureFields);
            complete("05");
          }}
        />
      )}

      {open === "06" && resolved && (
        <StrategyForm
          priorFields={caseFields}
          pathway={resolved.pathway}
          approvedGates={approvedGates}
          onSubmitted={(result) => complete("06", result.caseFields)}
        />
      )}

      {open === "07" && resolved && (
        <NoRpBspForm
          priorFields={caseFields}
          pathway={resolved.pathway}
          approvedGates={approvedGates}
          onSubmitted={(result) => complete("07", result.caseFields)}
        />
      )}

      {open === "08" && resolved && (
        <InterimBspForm
          priorFields={caseFields}
          pathway={resolved.pathway}
          approvedGates={approvedGates}
          onSubmitted={(result) => {
            setSafeguards(result.safeguards);
            complete("08", result.caseFields);
          }}
        />
      )}

      {open === "09" && resolved && (
        <ComprehensiveBspForm
          priorFields={caseFields}
          pathway={resolved.pathway}
          approvedGates={approvedGates}
          interimSafeguards={safeguards}
          onSubmitted={(result) => complete("09", result.caseFields)}
        />
      )}

      {captureFields.length > 0 && (
        <p className="field-note no-print">
          {captureFields.length} behaviour-capture row(s) held separately from the case record — they
          do not reach the Assessment / FBA Record.
        </p>
      )}
    </main>
  );
}

/** Documents 01 and 02 are answered once per case in this session-scoped
 * standalone build: re-opening one shows what it did rather than an
 * empty second copy that would silently replace the first. */
function CompletedNote({ id, title }: { id: string; title: string }) {
  return (
    <div role="status">
      <h2 className="section-title">
        {id} {title} — completed
      </h2>
      <p className="field-note">
        Answered earlier in this session. In this standalone build each case answers {id} once;
        changing it means starting a new case rather than overwriting the answers later documents
        were built on.
      </p>
    </div>
  );
}

function documentTitle(id: string): string {
  return id === "01" ? "Referral" : id === "02" ? "Practitioner Triage" : "";
}
