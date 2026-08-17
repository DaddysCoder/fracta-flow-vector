import { createHash } from "node:crypto";
import type { Transition } from "./types.js";

export type { Transition };

/**
 * One record of a clinical field's movement from one document to
 * another. The ledger is append-only: nothing here is ever mutated or
 * removed, only appended to, and each record is frozen on append to
 * make that structural.
 */
export interface LedgerRecord {
  fieldId: string;
  rowId?: string;
  /** Instance id of the document the value moved from. Null for a `new`
   * transition, which has no prior document. */
  fromDocument: string | null;
  /** Instance id of the document the value moved into. */
  toDocument: string;
  transition: Transition;
  actor: string;
  /** ISO 8601. Caller-supplied — the ledger never reads the system clock. */
  timestamp: string;
  /** Hash of the value as it stood before this transition. Null for a
   * `new` transition, which has no prior value. */
  priorValueHash: string | null;
}

export type Ledger = readonly LedgerRecord[];

export const EMPTY_LEDGER: Ledger = Object.freeze([]);

/** Deterministic, local, dependency-free — no network call, no clock read. */
export function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

/**
 * Append a transition to the ledger, returning a new ledger. The
 * argument ledger is never mutated, and the appended record is frozen so
 * later code can't quietly rewrite history.
 */
export function appendTransition(ledger: Ledger, record: LedgerRecord): Ledger {
  return [...ledger, Object.freeze({ ...record })];
}

function matches(record: LedgerRecord, fieldId: string, rowId?: string): boolean {
  return record.fieldId === fieldId && record.rowId === rowId;
}

/** Every recorded movement of this field (row), in the order they happened. */
export function historyFor(ledger: Ledger, fieldId: string, rowId?: string): LedgerRecord[] {
  return ledger.filter((record) => matches(record, fieldId, rowId));
}

/** The most recent recorded movement of this field (row), if any. Since
 * the ledger is append-only, the last matching entry is always current. */
export function latestTransition(
  ledger: Ledger,
  fieldId: string,
  rowId?: string,
): LedgerRecord | undefined {
  const history = historyFor(ledger, fieldId, rowId);
  return history[history.length - 1];
}
