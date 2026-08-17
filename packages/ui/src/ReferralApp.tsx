import type { TriageTask } from "@pbs/core";
import { useState } from "react";
import "./tokens.css";
import "./print.css";
import { ReferralForm } from "./ReferralForm.js";

/**
 * Standalone shell (MD-005): no login, no other tool, no network call —
 * everything here runs client-side against the registry bundled into
 * this build. Submission produces a TriageTask entirely in memory.
 */
export function ReferralApp() {
  const [task, setTask] = useState<TriageTask | null>(null);

  return (
    <main style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1.25rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--purple)", fontWeight: 700, margin: 0 }}>Fracta Flow</p>
        <h1 style={{ margin: "0.25rem 0" }}>01 — Referral</h1>
        <p className="field-note no-print">Standalone mode. No account, no other tool, no network call.</p>
      </header>

      <ReferralForm onSubmitted={setTask} />

      {task && (
        <pre className="no-print" style={{ background: "#f4f4f4", padding: "1rem", marginTop: "1.5rem" }}>
          {JSON.stringify(task, null, 2)}
        </pre>
      )}
    </main>
  );
}
