import { CAPABILITIES, resolve, type CaseRecord, type FieldEntry } from "@pbs/core";
import { renderBlankDocxBlob, renderCompletedDocxBlob } from "@pbs/export";
import { registry, type DocumentDef } from "@pbs/registry";
import { useMemo, useState } from "react";
import { ExportControls } from "./commercial/ExportControls.js";
import { ReadOnlyField } from "./fields/Field.js";
import type { RepeatableRow } from "./fields/RepeatableGroup.js";
import { FIELD_OPTIONS } from "./fieldOptions.js";
import { flattenValuesForExport, type FormValues } from "./FormRenderer.js";
import { toTargetDocument } from "./registryAdapter.js";
import { SOURCE_DOCUMENT_ID } from "./source.js";

const maybeSourceDocument = registry.documents[SOURCE_DOCUMENT_ID];
if (!maybeSourceDocument) throw new Error(`registry is missing document "${SOURCE_DOCUMENT_ID}"`);
const SOURCE_DOCUMENT: DocumentDef = maybeSourceDocument;

const SOURCE_FIELDS = registry.fields.filter((f) =>
  SOURCE_DOCUMENT.sections.some((s) => s.id === f.askedIn),
);

/** Fields quoted into this document from elsewhere (registry `rendersIn`
 * only — never authored here): the triaging practitioner's identity and
 * the document date. */
const SOURCE_QUOTED_FIELDS = registry.fields.filter(
  (f) =>
    !SOURCE_DOCUMENT.sections.some((s) => s.id === f.askedIn) &&
    f.rendersIn.some((section) => SOURCE_DOCUMENT.sections.some((s) => s.id === section)),
);

const EMPTY_VALUES: FormValues = { scalar: {}, groups: {} };

function newRowId(): string {
  return crypto.randomUUID();
}

/** Flattens a repeatable group's rows into FieldEntry[], keyed by rowId —
 * never by array position. */
function flattenGroups(groups: FormValues["groups"], sourceDocument: string, sourceDate: string): FieldEntry[] {
  const entries: FieldEntry[] = [];
  for (const rows of Object.values(groups)) {
    for (const row of rows) {
      for (const [fieldId, value] of Object.entries(row.values)) {
        entries.push({ fieldId, value, rowId: row.rowId, sourceDocument, sourceDate });
      }
    }
  }
  return entries;
}

export interface SourceResult {
  /** Every field known about the case so far, plus this register's own
   * entries — carried forward for document 04+. */
  caseFields: FieldEntry[];
}

export interface SourceFormProps {
  /** Everything known about the case up to this point — document 02's
   * fields plus everything document 01 answered before it, so this
   * register can quote the practitioner's identity back. */
  priorFields: FieldEntry[];
  /** Called once submission succeeds. This register never decides a
   * pathway or classification — it only records sources consulted. */
  onSubmitted: (result: SourceResult) => void;
  /** Injected for testability; defaults to real wall-clock time in the app. */
  now?: () => Date;
}

/**
 * Auto-detects a document type from its name, for the "Auto-detected: …"
 * badge the prototype shows while drafting an entry, and the type badge
 * shown on every saved row. Keyword matching only — this is presentation
 * help, never a clinical judgement, and the practitioner can always see
 * (and, before saving, is shown) exactly what was detected.
 */
const TYPE_KEYWORD_PATTERNS: Array<[RegExp, string]> = [
  [/referral/i, "referral"],
  [/assess/i, "assessment"],
  [/interview/i, "interview"],
  [/observ/i, "observation"],
  [/case\s*note/i, "case_note"],
  [/e-?mail/i, "email"],
  [/letter/i, "letter"],
  [/data|spreadsheet|register|log/i, "data"],
  [/report/i, "report"],
];

function detectDocumentType(name: string): string {
  for (const [pattern, type] of TYPE_KEYWORD_PATTERNS) {
    if (pattern.test(name)) return type;
  }
  return "other";
}

function typeLabel(type: string): string {
  return FIELD_OPTIONS["source_document.type"]?.find((opt) => opt.value === type)?.label ?? type;
}

interface DocumentDraft {
  name: string;
  date_made: string;
  author_name: string;
  author_role: string;
  company: string;
  about: string;
}

const EMPTY_DOCUMENT_DRAFT: DocumentDraft = {
  name: "",
  date_made: "",
  author_name: "",
  author_role: "",
  company: "",
  about: "",
};

interface ConsultationDraft {
  name: string;
  role: string;
  date_mode: string;
  what: string;
}

const EMPTY_CONSULTATION_DRAFT: ConsultationDraft = { name: "", role: "", date_mode: "", what: "" };

function textOf(row: RepeatableRow, fieldId: string): string {
  const value = row.values[fieldId];
  return typeof value === "string" ? value : "";
}

export function SourceForm({ priorFields, onSubmitted, now = () => new Date() }: SourceFormProps) {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [submitted, setSubmitted] = useState(false);
  const [docDraft, setDocDraft] = useState<DocumentDraft>(EMPTY_DOCUMENT_DRAFT);
  const [participantDraft, setParticipantDraft] = useState<ConsultationDraft>(EMPTY_CONSULTATION_DRAFT);
  const [otherDraft, setOtherDraft] = useState<ConsultationDraft>(EMPTY_CONSULTATION_DRAFT);

  const sourceId = "source-draft"; // one draft per session in this standalone build

  // Standalone (MD-005/MD-006), matching document 02: cross-document
  // prefill is locked off, so 03's quoted fields quote nothing across
  // documents. `ReadOnlyField` renders "Not yet available" for any
  // quoted field with no locally-recorded value, which is the correct
  // standalone answer, not a bug. See CONTRADICTIONS.md #5.
  const quotedValues = useMemo(() => {
    const caseRecord: CaseRecord = { fields: priorFields };
    const targetDocument = toTargetDocument(SOURCE_DOCUMENT_ID, sourceId);
    const resolved = resolve(caseRecord, targetDocument, CAPABILITIES.standalone, now());
    const merged: Record<string, unknown> = {};
    for (const entry of [...resolved.tier0, ...resolved.tier1, ...resolved.tier2]) {
      merged[entry.fieldId] = entry.value;
    }
    return merged;
  }, [priorFields]);

  const documentRows = values.groups.source_document ?? [];
  const participantRows = values.groups.consultation_participant ?? [];
  const otherRows = values.groups.consultation_other ?? [];
  const consultTotal = participantRows.length + otherRows.length;

  const draftDocType = docDraft.name.trim() ? detectDocumentType(docDraft.name) : "other";
  const draftDupWarning =
    docDraft.name.trim() !== "" &&
    documentRows.some((row) => textOf(row, "source_document.name").trim().toLowerCase() === docDraft.name.trim().toLowerCase());

  function addGroupRow(group: string, rowValues: Record<string, unknown>) {
    setValues((v) => ({
      ...v,
      groups: { ...v.groups, [group]: [...(v.groups[group] ?? []), { rowId: newRowId(), values: rowValues }] },
    }));
  }

  function removeGroupRow(group: string, rowId: string) {
    setValues((v) => ({
      ...v,
      groups: { ...v.groups, [group]: (v.groups[group] ?? []).filter((r) => r.rowId !== rowId) },
    }));
  }

  function addSourceRow() {
    if (!docDraft.name.trim()) return;
    addGroupRow("source_document", {
      "source_document.name": docDraft.name.trim(),
      "source_document.type": detectDocumentType(docDraft.name),
      "source_document.date_made": docDraft.date_made.trim(),
      "source_document.author_name": docDraft.author_name.trim(),
      "source_document.author_role": docDraft.author_role.trim(),
      "source_document.company": docDraft.company.trim(),
      "source_document.about": docDraft.about.trim(),
    });
    setDocDraft(EMPTY_DOCUMENT_DRAFT);
  }

  function addConsultationRow(
    group: "consultation_participant" | "consultation_other",
    draft: ConsultationDraft,
    resetDraft: () => void,
  ) {
    if (!draft.name.trim()) return;
    addGroupRow(group, {
      [`${group}.name`]: draft.name.trim(),
      [`${group}.role`]: draft.role.trim(),
      [`${group}.date_mode`]: draft.date_mode.trim(),
      [`${group}.what`]: draft.what.trim(),
    });
    resetDraft();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const timestamp = now().toISOString();
    const groupEntries = flattenGroups(values.groups, sourceId, timestamp);
    const caseFields = [...priorFields, ...groupEntries];

    setSubmitted(true);
    onSubmitted({ caseFields });
  }

  if (submitted) {
    return (
      <div role="status">
        <h1>Source and consultation register complete</h1>
        <p>
          Your register entries remain in this browser session only. Nothing was uploaded or stored
          on WHATBIT servers. Use export or print if you want a copy outside this device.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <ExportControls
        renderBlank={(brand) => renderBlankDocxBlob(SOURCE_DOCUMENT, SOURCE_DOCUMENT_ID, SOURCE_FIELDS, brand)}
        renderCompleted={(brand) =>
          renderCompletedDocxBlob(
            SOURCE_DOCUMENT,
            SOURCE_DOCUMENT_ID,
            SOURCE_FIELDS,
            brand,
            flattenValuesForExport(values),
          )
        }
        blankFilename="vector-source-register-blank.docx"
        completedFilename="vector-source-register-completed.docx"
      />

      <div className="wizard-eyebrow-row">
        <span className="wizard-eyebrow">DOCUMENT 03 · FREE</span>
      </div>
      <h1 style={{ margin: "0 0 0.375rem" }}>Source &amp; Consultation Register</h1>
      <p style={{ margin: "0 0 1.5rem", maxWidth: "640px", color: "var(--muted)" }}>
        Record every prior report, referral document or record reviewed, and every person consulted
        — one entry per source, one entry per consultation.
      </p>

      {SOURCE_QUOTED_FIELDS.length > 0 && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          {SOURCE_QUOTED_FIELDS.map((field) => (
            <ReadOnlyField key={field.id} field={field} value={quotedValues[field.id]} />
          ))}
        </div>
      )}

      {/* 03.A Document register */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="register-header-row">
          <h2 className="section-title" style={{ margin: 0 }}>
            03.A Document register
          </h2>
          <span className="register-count">{documentRows.length} documents logged</span>
        </div>

        {documentRows.map((row) => {
          const about = textOf(row, "source_document.about");
          const role = textOf(row, "source_document.author_role");
          return (
            <div className="register-entry-row" key={row.rowId}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.1875rem" }}>
                  <span className="register-type-badge">{typeLabel(textOf(row, "source_document.type"))}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{textOf(row, "source_document.name")}</span>
                </div>
                <div style={{ fontSize: "0.78125rem", color: "var(--muted)" }}>
                  {textOf(row, "source_document.date_made")} · {textOf(row, "source_document.author_name")}
                  {role && ` (${role})`}
                </div>
                {about && (
                  <div style={{ fontSize: "0.78125rem", color: "var(--muted)", marginTop: "0.25rem", lineHeight: 1.5 }}>
                    {about}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="register-entry-remove"
                onClick={() => removeGroupRow("source_document", row.rowId)}
              >
                Remove
              </button>
            </div>
          );
        })}

        <div className="register-draft-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.625rem" }}>
            <label htmlFor="source-doc-name" style={{ display: "none" }}>
              Document name
            </label>
            <input
              id="source-doc-name"
              type="text"
              placeholder="Document name"
              value={docDraft.name}
              onChange={(e) => setDocDraft({ ...docDraft, name: e.target.value })}
              style={{ flex: 1 }}
            />
            <span className="register-type-badge" style={{ background: "#fff", border: "1px solid var(--border-hairline)", color: "var(--muted-2)" }}>
              Auto-detected: {typeLabel(draftDocType)}
            </span>
          </div>

          {draftDupWarning && (
            <div className="register-dup-warning">
              A document with this name is already logged — check this isn&apos;t a duplicate entry.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem", marginBottom: "0.625rem" }}>
            <input
              type="text"
              placeholder="Date made"
              value={docDraft.date_made}
              onChange={(e) => setDocDraft({ ...docDraft, date_made: e.target.value })}
            />
            <input
              type="text"
              placeholder="Author name"
              value={docDraft.author_name}
              onChange={(e) => setDocDraft({ ...docDraft, author_name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Author role"
              value={docDraft.author_role}
              onChange={(e) => setDocDraft({ ...docDraft, author_role: e.target.value })}
            />
          </div>
          <input
            type="text"
            placeholder="Company / service"
            value={docDraft.company}
            onChange={(e) => setDocDraft({ ...docDraft, company: e.target.value })}
            style={{ marginBottom: "0.625rem", width: "100%" }}
          />
          <textarea
            rows={2}
            placeholder="What it's about (brief)"
            value={docDraft.about}
            onChange={(e) => setDocDraft({ ...docDraft, about: e.target.value })}
            style={{ marginBottom: "0.75rem", width: "100%" }}
          />
          <button type="button" className="primary" onClick={addSourceRow}>
            Add entry
          </button>
        </div>
      </div>

      {/* 03.B Consultation log */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="register-header-row">
          <h2 className="section-title" style={{ margin: 0 }}>
            03.B Consultation log
          </h2>
          <span className="register-count">{consultTotal} entries</span>
        </div>

        <ConsultationList
          heading="Consultation with the participant"
          rows={participantRows}
          group="consultation_participant"
          draft={participantDraft}
          setDraft={setParticipantDraft}
          onAdd={() => addConsultationRow("consultation_participant", participantDraft, () => setParticipantDraft(EMPTY_CONSULTATION_DRAFT))}
          onRemove={(rowId) => removeGroupRow("consultation_participant", rowId)}
        />

        <ConsultationList
          heading="Consultation with others"
          rows={otherRows}
          group="consultation_other"
          draft={otherDraft}
          setDraft={setOtherDraft}
          onAdd={() => addConsultationRow("consultation_other", otherDraft, () => setOtherDraft(EMPTY_CONSULTATION_DRAFT))}
          onRemove={(rowId) => removeGroupRow("consultation_other", rowId)}
        />
      </div>

      <button type="submit" className="primary no-print" style={{ marginTop: "1.5rem" }}>
        Complete register
      </button>
    </form>
  );
}

interface ConsultationListProps {
  heading: string;
  rows: RepeatableRow[];
  group: "consultation_participant" | "consultation_other";
  draft: ConsultationDraft;
  setDraft: (draft: ConsultationDraft) => void;
  onAdd: () => void;
  onRemove: (rowId: string) => void;
}

/** One of the two consultation lists (participant / others) — same
 * saved-rows-plus-draft-box shape as the document register, just with a
 * shorter field set (no auto-detected type, no duplicate check: a person
 * consulted twice is expected, not a data-entry mistake). */
function ConsultationList({ heading, rows, group, draft, setDraft, onAdd, onRemove }: ConsultationListProps) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <p className="register-subheading">{heading}</p>

      {rows.map((row) => {
        const role = textOf(row, `${group}.role`);
        const what = textOf(row, `${group}.what`);
        return (
          <div className="register-entry-row" key={row.rowId}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                {textOf(row, `${group}.name`)}
                {role && <span style={{ fontWeight: 400, color: "var(--muted)" }}> · {role}</span>}
              </div>
              <div style={{ fontSize: "0.78125rem", color: "var(--muted)", marginTop: "0.125rem" }}>
                {textOf(row, `${group}.date_mode`)}
              </div>
              {what && (
                <div style={{ fontSize: "0.78125rem", color: "var(--muted)", marginTop: "0.25rem" }}>{what}</div>
              )}
            </div>
            <button type="button" className="register-entry-remove" onClick={() => onRemove(row.rowId)}>
              Remove
            </button>
          </div>
        );
      })}

      <div className="register-draft-card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem", marginBottom: "0.625rem" }}>
          <input
            type="text"
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Role"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
          />
          <input
            type="text"
            placeholder="Date and mode"
            value={draft.date_mode}
            onChange={(e) => setDraft({ ...draft, date_mode: e.target.value })}
          />
        </div>
        <textarea
          rows={2}
          placeholder="What was discussed / provided"
          value={draft.what}
          onChange={(e) => setDraft({ ...draft, what: e.target.value })}
          style={{ marginBottom: "0.75rem", width: "100%" }}
        />
        <button type="button" className="primary" onClick={onAdd}>
          Add entry
        </button>
      </div>
    </div>
  );
}
