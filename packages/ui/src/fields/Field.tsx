import type { FieldDef } from "@pbs/registry";
import { FIELD_OPTIONS } from "../fieldOptions.js";

export interface FieldProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  required: boolean;
}

/**
 * One field's control, dispatched purely by `field.type` — this is the
 * whole point of "no hand-written markup per field": adding a field to
 * the registry is enough, nothing here changes per field id.
 */
export function Field({ field, value, onChange, required }: FieldProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={field.id}>
        {field.label}
        {required && (
          <span className="field-required-mark" aria-hidden={false}>
            *
          </span>
        )}
      </label>
      <FieldControl field={field} value={value} onChange={onChange} required={required} />
      {field.note && <p className="field-note">{field.note}</p>}
    </div>
  );
}

export interface ReadOnlyFieldProps {
  field: FieldDef;
  /** The resolved value, or `undefined` if nothing has been recorded yet. */
  value: unknown;
}

/**
 * Displays a value quoted from another document (registry `rendersIn`) —
 * read-only, dispatched by `field.type` like `Field`'s own controls, so no
 * per-field markup is needed here either. Never blank: a missing value
 * says so explicitly rather than rendering empty.
 */
export function ReadOnlyField({ field, value }: ReadOnlyFieldProps) {
  return (
    <div className="field field-readonly">
      <p className="field-label">{field.label}</p>
      <p className="field-readonly-value">{formatReadOnlyValue(field, value)}</p>
    </div>
  );
}

const NOT_YET_AVAILABLE = "Not yet available";

function formatReadOnlyValue(field: FieldDef, value: unknown): string {
  if (value === undefined || value === null || value === "") return NOT_YET_AVAILABLE;

  switch (field.type) {
    case "select": {
      const match = (FIELD_OPTIONS[field.id] ?? []).find((opt) => opt.value === value);
      return match?.label ?? String(value);
    }
    case "multiselect": {
      const values = value as string[];
      if (values.length === 0) return NOT_YET_AVAILABLE;
      const options = FIELD_OPTIONS[field.id] ?? [];
      return values.map((v) => options.find((opt) => opt.value === v)?.label ?? v).join(", ");
    }
    case "tristate":
      return value === "unanswered" ? "Not answered" : String(value);
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

function FieldControl({ field, value, onChange, required }: FieldProps) {
  const id = field.id;
  switch (field.type) {
    case "short_text":
      return (
        <input
          id={id}
          type="text"
          value={(value as string) ?? ""}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "long_text":
      return (
        <textarea
          id={id}
          value={(value as string) ?? ""}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "date":
      return (
        <input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          id={id}
          type="number"
          value={(value as number) ?? ""}
          required={required}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );
    case "file":
      return (
        <input
          id={id}
          type="file"
          required={required}
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? undefined)}
        />
      );
    case "select":
      return (
        <select
          id={id}
          value={(value as string) ?? ""}
          required={required}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">Select…</option>
          {(FIELD_OPTIONS[id] ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "multiselect": {
      const selected = new Set((value as string[] | undefined) ?? []);
      return (
        <div className="multiselect-group" role="group" aria-labelledby={id}>
          {(FIELD_OPTIONS[id] ?? []).map((opt) => (
            <label className="multiselect-option" key={opt.value}>
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(opt.value);
                  else next.delete(opt.value);
                  onChange([...next]);
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
    }
    case "tristate":
      // Tri-state renders as three explicit controls — never a single
      // checkbox standing in for "unanswered".
      return (
        <div className="tristate-group" role="radiogroup" aria-labelledby={id}>
          {(["yes", "no", "unanswered"] as const).map((option) => (
            <label className="tristate-option" key={option}>
              <input
                type="radio"
                name={id}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              {option === "unanswered" ? "Not answered" : option}
            </label>
          ))}
        </div>
      );
    default:
      return null;
  }
}
