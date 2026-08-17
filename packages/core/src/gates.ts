import { isAuthoredHere } from "./scope.js";
import type { Capabilities, TargetDocument } from "./types.js";

export type Pathway = "no_rp" | "interim" | "comprehensive";

export type SafeguardDisposition = "replace" | "retain_with_new_justification" | "revise" | "retire";

/** A temporary safeguard recorded on the Interim BSP. Always carries an
 * explicit `unassessed` flag — it is never mistaken for a Strategy
 * Instance, which the Interim BSP forbids outright. */
export interface InterimSafeguard {
  id: string;
  unassessed: boolean;
  /** No default. A comprehensive release blocks until every safeguard
   * has one of the four dispositions below — null is never silently
   * treated as safe. */
  disposition: SafeguardDisposition | null;
}

export interface GateContext {
  /** Registry document type id, e.g. "06", "07", "08", "09". */
  documentId: string;
  pathway: Pathway;
  /** Gate names already satisfied for this case, e.g. {"fba.approved"}. */
  approvedGates: ReadonlySet<string>;
  targetDocument: TargetDocument;
}

export interface GateViolation {
  gate: string;
  message: string;
  /**
   * "blocking" when caps.transitionLedger is on: the caller must refuse
   * the action. "guidance" when it's off (standalone): the same check
   * still ran and the same message is surfaced, but as text the
   * practitioner reads rather than something enforced — a standalone
   * tool has no other document to enforce against anyway. Guidance,
   * never a silent pass: the violation is always returned, never
   * dropped.
   */
  severity: "blocking" | "guidance";
}

function authorsTier3(doc: TargetDocument): boolean {
  return doc.fields.some((f) => f.tier === 3 && isAuthoredHere(f, doc));
}

function authorsStrategyInstance(doc: TargetDocument): boolean {
  return doc.fields.some((f) => f.isStrategyInstance && isAuthoredHere(f, doc));
}

function withSeverity(
  violation: { gate: string; message: string },
  caps: Capabilities,
): GateViolation {
  return { ...violation, severity: caps.transitionLedger ? "blocking" : "guidance" };
}

/**
 * Gates checked whenever a document is opened for authoring. Always
 * evaluated regardless of `caps` — only the resulting severity changes.
 */
export function checkAuthoringGates(context: GateContext, caps: Capabilities): GateViolation[] {
  const violations: { gate: string; message: string }[] = [];
  const { documentId, pathway, approvedGates, targetDocument } = context;

  const requiresFbaApproval =
    (pathway === "no_rp" || pathway === "comprehensive") && authorsTier3(targetDocument);
  if (requiresFbaApproval && !approvedGates.has("fba.approved")) {
    violations.push({
      gate: "fba.approved",
      message:
        `Tier 3 (interpretation) fields in the ${pathway} plan require the FBA ` +
        "conclusion (04.9) to be approved before they can be authored.",
    });
  }

  if (authorsStrategyInstance(targetDocument) && !approvedGates.has("fba.approved")) {
    violations.push({
      gate: "fba.approved",
      message: "Strategy Instance authoring is locked until the FBA conclusion (04.9) is approved.",
    });
  }

  if (pathway === "interim" && authorsStrategyInstance(targetDocument)) {
    violations.push({
      gate: "interim.no_strategy_instances",
      message:
        "The Interim BSP permits no Strategy Instances. Record a temporary " +
        "safeguard (flagged unassessed) instead.",
    });
  }

  // documentId is intentionally unused beyond context today — every
  // check above is derived from the document's own field schema, not a
  // hardcoded id — but kept on the context because release-time checks
  // (see checkReleaseGates) key specifically off "09".
  void documentId;

  return violations.map((v) => withSeverity(v, caps));
}

/**
 * Gates checked again at release time — authoring gates plus the
 * comprehensive-release safeguard-disposition check. "Re-checked at
 * release" per spec: nothing here trusts that authoring-time gates were
 * honored earlier.
 */
export function checkReleaseGates(
  context: GateContext,
  caps: Capabilities,
  interimSafeguards: InterimSafeguard[] = [],
): GateViolation[] {
  const violations = checkAuthoringGates(context, caps);

  if (context.documentId === "09") {
    const undisposed = interimSafeguards.filter((s) => s.disposition === null);
    if (undisposed.length > 0) {
      violations.push(
        withSeverity(
          {
            gate: "interim.dispositions_complete",
            message:
              `Comprehensive BSP cannot release: ${undisposed.length} interim safeguard(s) ` +
              "lack a disposition (replace | retain_with_new_justification | revise | retire). " +
              "No default value — this is blocking.",
          },
          caps,
        ),
      );
    }
  }

  return violations;
}
