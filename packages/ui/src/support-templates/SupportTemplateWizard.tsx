import type { Brand } from "@pbs/export";
import { useMemo, useState } from "react";
import { canUseFeature } from "../commercial/entitlements.js";
import { useVectorCommercial } from "../commercial/CommercialContext.js";
import { RRP_FIELD_DEFS, RRP_TYPES } from "./constants.js";
import { buildInitialStateFromInterim, DIFF_FIELD_DEFS } from "./configs.js";
import { renderSupportTemplateBlankDocx, renderSupportTemplateDocx } from "./docxExport.js";
import { buildTemplateContext } from "./prefill.js";
import { ProfessionalToolDisclaimer } from "../ProfessionalToolDisclaimer.js";
import { saveTemplateState, STORAGE_DISCLOSURE } from "./storage.js";
import "./supportTemplates.css";
import {
  EMPTY_TEMPLATE_STATE,
  type BehaviourEntry,
  type SupportTemplateState,
  type TemplateConfig,
  type TemplateStep,
} from "./types.js";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function applyDefaults(step: TemplateStep, state: SupportTemplateState): SupportTemplateState {
  const next = { ...state, v: { ...state.v } };
  for (const field of step.text ?? []) {
    if (next.v[field.key] === undefined && field.defaultValue) next.v[field.key] = field.defaultValue;
  }
  for (const field of step.longs ?? []) {
    if (next.v[field.key] === undefined && field.defaultValue) next.v[field.key] = field.defaultValue;
  }
  return next;
}

export interface SupportTemplateWizardProps {
  config: TemplateConfig;
  backHref?: string;
}

export function SupportTemplateWizard({ config, backHref = "/support-templates" }: SupportTemplateWizardProps) {
  const ctx = useMemo(() => buildTemplateContext(), []);
  const steps = useMemo(() => config.steps(ctx), [config, ctx]);
  const interimSeed = useMemo(() => buildInitialStateFromInterim(ctx.interim), [ctx.interim]);

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [state, setState] = useState<SupportTemplateState>(() => ({
    ...EMPTY_TEMPLATE_STATE,
    ...(interimSeed ?? {}),
  }));
  const [structDrafts, setStructDrafts] = useState<Record<string, Record<string, string>>>({});
  const [listDrafts, setListDrafts] = useState<Record<string, string>>({});

  const { entitlements, exportBrand, requestUpgrade } = useVectorCommercial();
  const canUse = canUseFeature(entitlements, "support_templates");
  const canExport = canUseFeature(entitlements, "export");

  const step = steps[idx]!;
  const participantLine = `${state.v.name || ctx.referral.name || "Participant name"}${state.v.ndis || ctx.referral.ndis ? ` · ${state.v.ndis || ctx.referral.ndis}` : ""}`;

  function setField(key: string, value: string) {
    setState((prev) => ({ ...prev, v: { ...prev.v, [key]: value } }));
  }

  function setConfirm(key: string, value: boolean) {
    setState((prev) => ({ ...prev, confirms: { ...prev.confirms, [key]: value } }));
  }

  function updateBehaviour(index: number, patch: Partial<BehaviourEntry>) {
    setState((prev) => {
      const behaviours = prev.behaviours.slice();
      behaviours[index] = { ...behaviours[index]!, ...patch };
      return { ...prev, behaviours };
    });
  }

  function setStructDraft(listKey: string, fieldKey: string, value: string) {
    setStructDrafts((prev) => ({
      ...prev,
      [listKey]: { ...(prev[listKey] ?? {}), [fieldKey]: value },
    }));
  }

  function addStructRow(listKey: string, columns: Array<{ key: string }>) {
    const draft = structDrafts[listKey] ?? {};
    if (!columns.some((c) => (draft[c.key] ?? "").trim())) return;
    setState((prev) => ({
      ...prev,
      structLists: {
        ...prev.structLists,
        [listKey]: [...(prev.structLists[listKey] ?? []), { ...draft }],
      },
    }));
    setStructDrafts((prev) => ({ ...prev, [listKey]: {} }));
  }

  function removeStructRow(listKey: string, rowIndex: number) {
    setState((prev) => ({
      ...prev,
      structLists: {
        ...prev.structLists,
        [listKey]: (prev.structLists[listKey] ?? []).filter((_, i) => i !== rowIndex),
      },
    }));
  }

  function addListItem(listKey: string) {
    const draft = (listDrafts[listKey] ?? "").trim();
    if (!draft) return;
    setState((prev) => ({
      ...prev,
      lists: { ...prev.lists, [listKey]: [...(prev.lists[listKey] ?? []), draft] },
    }));
    setListDrafts((prev) => ({ ...prev, [listKey]: "" }));
  }

  function removeListItem(listKey: string, itemIndex: number) {
    setState((prev) => ({
      ...prev,
      lists: {
        ...prev.lists,
        [listKey]: (prev.lists[listKey] ?? []).filter((_, i) => i !== itemIndex),
      },
    }));
  }

  function toggleRrp(type: string) {
    setState((prev) => ({
      ...prev,
      rrpTypes: { ...prev.rrpTypes, [type]: !prev.rrpTypes[type] },
    }));
  }

  function setRrpField(type: string, key: string, value: string) {
    setState((prev) => ({
      ...prev,
      rrpFields: {
        ...prev.rrpFields,
        [type]: { ...(prev.rrpFields[type] ?? {}), [key]: value },
      },
    }));
  }

  function advance() {
    if (idx >= steps.length - 1) {
      saveTemplateState(config.storageKey, state);
      setPhase("sent");
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setState((prev) => applyDefaults(steps[nextIdx]!, prev));
  }

  function back() {
    if (idx > 0) setIdx(idx - 1);
  }

  function reset() {
    setIdx(0);
    setPhase("form");
    setState({ ...EMPTY_TEMPLATE_STATE, ...(interimSeed ?? {}) });
    setStructDrafts({});
    setListDrafts({});
  }

  async function handleExport(render: (brand: Brand) => Promise<Blob>, filename: string) {
    if (!canExport) {
      requestUpgrade("export");
      return;
    }
    downloadBlob(await render(exportBrand), filename);
  }

  if (!canUse) {
    return (
      <div className="support-template-shell">
        <div className="support-template-gate">
          <p className="support-template-eyebrow">{config.eyebrow} · VECTOR</p>
          <h1 className="support-template-step-title">Support Templates require Vector Paid</h1>
          <p className="support-template-note">
            Upgrade to unlock behaviour support plan templates. Template content stays on your device in session
            storage and is never sent to WHATBIT servers.
          </p>
          <button type="button" className="support-template-primary" onClick={() => requestUpgrade("support_templates")}>
            Upgrade to unlock
          </button>{" "}
          <a href={backHref} style={{ marginLeft: "0.75rem" }}>
            ← Support Templates
          </a>
        </div>
      </div>
    );
  }

  if (phase === "sent") {
    return (
      <div className="support-template-shell">
        <div className="support-template-complete-icon" aria-hidden="true">
          ✓
        </div>
        <h1 className="support-template-step-title">{config.completionTitle}</h1>
        <p className="support-template-note">Saved to your device. Nothing here is stored on Vector&apos;s servers.</p>
        {config.completionNote ? <p className="support-template-note">{config.completionNote}</p> : null}
        <p className="field-note">{STORAGE_DISCLOSURE}</p>
        <ProfessionalToolDisclaimer />
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button
            type="button"
            className="support-template-primary"
            style={{ flex: "none", padding: "0 22px" }}
            onClick={() => void handleExport(() => renderSupportTemplateDocx(config, state, exportBrand), `${config.id}.docx`)}
          >
            {canExport ? "Download DOCX" : "Paid — Download DOCX"}
          </button>
          <button
            type="button"
            className="support-template-secondary"
            onClick={() => {
              if (!canExport) requestUpgrade("export");
              else window.print();
            }}
          >
            {canExport ? "Print / Save as PDF" : "Paid — Print / Save as PDF"}
          </button>
        </div>
        <p className="field-note" style={{ marginBottom: "1.5rem" }}>
          Organisation branding applies automatically when set in your Vector brand settings.
        </p>
        <button type="button" className="support-template-secondary" style={{ width: "100%" }} onClick={reset}>
          Start another plan
        </button>
      </div>
    );
  }

  return (
    <div className="support-template-shell">
      <div className="support-template-top no-print">
        <a href={backHref} style={{ fontSize: "13px", fontWeight: 700, color: "#6b6b6b" }}>
          ← Support Templates
        </a>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <div className="support-template-eyebrow">{config.eyebrow} · VECTOR</div>
        <div className="support-template-step-label">
          STEP {idx + 1} OF {steps.length}
        </div>
      </div>

      <div className="support-template-progress no-print" aria-hidden="true">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`support-template-progress-seg ${i < idx ? "done" : ""} ${i === idx ? "current" : ""}`}
          />
        ))}
      </div>

      <p className="support-template-participant">{participantLine}</p>
      <h1 className="support-template-step-title">{step.title}</h1>
      {step.note ? <p className="support-template-note">{step.note}</p> : null}
      <p className="field-note no-print">{STORAGE_DISCLOSURE}</p>
      <ProfessionalToolDisclaimer />

      {(step.text ?? []).map((field) => (
        <div key={field.key} className="support-template-field">
          <label className="support-template-label" htmlFor={field.key}>
            {field.label}
            {field.tag ? <span className="support-template-tag">{field.tag}</span> : null}
          </label>
          <input
            id={field.key}
            className="support-template-input"
            value={state.v[field.key] ?? field.defaultValue ?? ""}
            onChange={(e) => setField(field.key, e.target.value)}
          />
        </div>
      ))}

      {(step.longs ?? []).map((field) => (
        <div key={field.key} className="support-template-field">
          <label className="support-template-label" htmlFor={field.key}>
            {field.label}
            {field.tag ? <span className="support-template-tag">{field.tag}</span> : null}
          </label>
          <textarea
            id={field.key}
            className="support-template-textarea"
            value={state.v[field.key] ?? field.defaultValue ?? ""}
            onChange={(e) => setField(field.key, e.target.value)}
          />
        </div>
      ))}

      {step.kind === "behaviours"
        ? state.behaviours.map((b, i) => (
            <div key={i} className="support-template-card">
              <input
                className="support-template-input"
                style={{ border: "none", fontWeight: 700, marginBottom: "0.75rem" }}
                value={b.name}
                onChange={(e) => updateBehaviour(i, { name: e.target.value })}
                aria-label={`Behaviour ${i + 1} name`}
              />
              {(
                [
                  ["desc", "Description"],
                  ["freq", "Frequency / duration"],
                  ["intensity", "Intensity and risk"],
                  ["triggers", "Known triggers"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} style={{ marginBottom: "0.75rem" }}>
                  <div className="support-template-label">{label}</div>
                  <textarea
                    className="support-template-textarea"
                    style={{ minHeight: "56px", background: "#fafafa", fontSize: "13.5px" }}
                    value={b[key]}
                    onChange={(e) => updateBehaviour(i, { [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          ))
        : null}

      {(step.struct ?? []).map((sl) => (
        <div key={sl.key} style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "0.75rem" }}>{sl.label}</h2>
          {(state.structLists[sl.key] ?? []).map((row, rowIndex) => (
            <div key={rowIndex} style={{ borderBottom: "1px solid #f0f0f0", padding: "0.75rem 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${sl.columns.length}, 1fr)`, gap: "12px" }}>
                {sl.columns.map((col) => (
                  <div key={col.key}>
                    <div className="support-template-label">{col.label}</div>
                    <div style={{ fontSize: "13.5px", whiteSpace: "pre-wrap" }}>{row[col.key] || "—"}</div>
                  </div>
                ))}
              </div>
              <button type="button" style={{ marginTop: "0.5rem", border: "none", background: "transparent", color: "#8b5cf6", cursor: "pointer" }} onClick={() => removeStructRow(sl.key, rowIndex)}>
                Remove entry
              </button>
            </div>
          ))}
          <div className="support-template-card" style={{ background: "#fafafa" }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${sl.columns.length}, 1fr)`, gap: "12px", marginBottom: "0.75rem" }}>
              {sl.columns.map((col) => (
                <div key={col.key}>
                  <label className="support-template-label">{col.label}</label>
                  {col.multiline ? (
                    <textarea
                      className="support-template-textarea"
                      style={{ minHeight: "60px", fontSize: "13px" }}
                      value={structDrafts[sl.key]?.[col.key] ?? ""}
                      onChange={(e) => setStructDraft(sl.key, col.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="support-template-input"
                      style={{ height: "38px", fontSize: "13px" }}
                      value={structDrafts[sl.key]?.[col.key] ?? ""}
                      onChange={(e) => setStructDraft(sl.key, col.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="support-template-primary" style={{ flex: "none", height: "38px", padding: "0 18px" }} onClick={() => addStructRow(sl.key, sl.columns)}>
              Add entry
            </button>
          </div>
        </div>
      ))}

      {step.kind === "rrp" ? (
        <>
          <p className="support-template-label">Which regulated restrictive practice(s) are in use?</p>
          <div className="support-template-chip-row">
            {RRP_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`support-template-chip ${state.rrpTypes[type] ? "selected" : ""}`}
                onClick={() => toggleRrp(type)}
              >
                {type}
              </button>
            ))}
          </div>
          {RRP_TYPES.filter((t) => state.rrpTypes[t]).map((type) => (
            <div key={type} className="support-template-card">
              <h3 style={{ marginTop: 0, fontSize: "15px" }}>{type}</h3>
              {RRP_FIELD_DEFS.map(([key, label]) => (
                <div key={key} style={{ marginBottom: "0.75rem" }}>
                  <div className="support-template-label">{label}</div>
                  <textarea
                    className="support-template-textarea"
                    style={{ minHeight: "60px", background: "#fafafa", fontSize: "13.5px" }}
                    value={state.rrpFields[type]?.[key] ?? ""}
                    onChange={(e) => setRrpField(type, key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}

      {(step.lists ?? []).map((lf) => (
        <div key={lf.key} className="support-template-field">
          <div className="support-template-label">{lf.label}</div>
          {(state.lists[lf.key] ?? []).map((item, itemIndex) => (
            <div key={itemIndex} className="support-template-row-item">
              <span style={{ flex: 1 }}>{item}</span>
              <button type="button" aria-label="Remove" onClick={() => removeListItem(lf.key, itemIndex)}>
                ×
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              className="support-template-input"
              style={{ height: "42px" }}
              value={listDrafts[lf.key] ?? ""}
              placeholder={lf.placeholder}
              onChange={(e) => setListDrafts((prev) => ({ ...prev, [lf.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addListItem(lf.key);
                }
              }}
            />
            <button type="button" className="support-template-primary" style={{ flex: "none", height: "42px" }} onClick={() => addListItem(lf.key)}>
              Add
            </button>
          </div>
        </div>
      ))}

      {step.kind === "diff" && ctx.interim ? (
        <div>
          {DIFF_FIELD_DEFS.map(([key, label]) => {
            const interimVal = ctx.interim?.v[key] ?? "";
            const currentVal = state.v[key] ?? interimVal;
            const changed = interimVal !== currentVal;
            return (
              <div key={key} className="support-template-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <strong>{label}</strong>
                  <span className={`support-template-diff-tag ${changed ? "edited" : "unchanged"}`}>
                    {changed ? "EDITED" : "UNCHANGED"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <div className="support-template-label">FROM INTERIM BSP</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{interimVal || "—"}</div>
                  </div>
                  <div>
                    <div className="support-template-label">IN THIS PLAN</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{currentVal || "—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {step.confirm ? (
        <div
          className={`support-template-check-row ${state.confirms[step.confirm[0]] ? "checked" : ""}`}
          onClick={() => setConfirm(step.confirm![0], !state.confirms[step.confirm![0]])}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setConfirm(step.confirm![0], !state.confirms[step.confirm![0]]);
            }
          }}
          role="checkbox"
          aria-checked={Boolean(state.confirms[step.confirm[0]])}
          tabIndex={0}
        >
          <span>{state.confirms[step.confirm[0]] ? "☑" : "☐"}</span>
          <span>{step.confirm[1]}</span>
        </div>
      ) : null}

      {step.selfDeclare ? (
        <div style={{ marginBottom: "1rem" }}>
          <div className="support-template-label">Practitioner status</div>
          <div
            className={`support-template-check-row ${state.confirms.proficient ? "checked" : ""}`}
            onClick={() => setConfirm("proficient", !state.confirms.proficient)}
            role="checkbox"
            aria-checked={Boolean(state.confirms.proficient)}
            tabIndex={0}
          >
            <span>{state.confirms.proficient ? "☑" : "☐"}</span>
            <span>I am a proficient behaviour support practitioner.</span>
          </div>
          {!state.confirms.proficient ? (
            <>
              <label className="support-template-label" htmlFor="supervisorName">
                Supervisor name
              </label>
              <input
                id="supervisorName"
                className="support-template-input"
                value={state.v.supervisorName ?? ""}
                onChange={(e) => setField("supervisorName", e.target.value)}
              />
              <div
                className={`support-template-check-row ${state.confirms.supervisorReviewed ? "checked" : ""}`}
                onClick={() => setConfirm("supervisorReviewed", !state.confirms.supervisorReviewed)}
                role="checkbox"
                aria-checked={Boolean(state.confirms.supervisorReviewed)}
                tabIndex={0}
              >
                <span>{state.confirms.supervisorReviewed ? "☑" : "☐"}</span>
                <span>A supervisor has reviewed and signed off this plan.</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {step.kind === "summary" ? (
        <div className="support-template-summary">
          <div className="support-template-eyebrow" style={{ marginBottom: "0.75rem" }}>
            PLAN SUMMARY
          </div>
          {config.summaryRows(state).map((row) => (
            <div key={row.k} className="support-template-summary-row">
              <span style={{ color: "#6b6b6b" }}>{row.k}</span>
              <strong style={{ textAlign: "right" }}>{row.v}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div className="support-template-footer no-print">
        {idx > 0 ? (
          <button type="button" className="support-template-secondary" onClick={back}>
            Back
          </button>
        ) : null}
        <button type="button" className="support-template-primary" onClick={advance}>
          {idx === steps.length - 1 ? config.saveLabel : "Next"}
        </button>
      </div>
    </div>
  );
}

export async function exportBlankSupportTemplate(config: TemplateConfig, brand: Brand): Promise<Blob> {
  return renderSupportTemplateBlankDocx(config, brand);
}
