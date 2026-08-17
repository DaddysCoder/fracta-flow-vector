import type { FieldDef } from "@pbs/registry";
import { Field } from "./Field.js";

export interface RepeatableRow {
  rowId: string;
  values: Record<string, unknown>;
}

export interface RepeatableGroupProps {
  groupLabel: string;
  fields: FieldDef[];
  rows: RepeatableRow[];
  onChange: (rows: RepeatableRow[]) => void;
  requiredFieldIds: Set<string>;
  newRowId: () => string;
}

/** Repeatable groups render as add/remove row lists — never a fixed set
 * of numbered fields. */
export function RepeatableGroup({
  groupLabel,
  fields,
  rows,
  onChange,
  requiredFieldIds,
  newRowId,
}: RepeatableGroupProps) {
  return (
    <div className="repeatable-group">
      <p className="field-label">{groupLabel}</p>
      {rows.map((row, index) => (
        <div className="repeatable-row" key={row.rowId}>
          {fields.map((field) => (
            <Field
              key={field.id}
              field={field}
              value={row.values[field.id]}
              required={requiredFieldIds.has(field.id)}
              onChange={(value) => {
                const next = [...rows];
                next[index] = { ...row, values: { ...row.values, [field.id]: value } };
                onChange(next);
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => onChange(rows.filter((r) => r.rowId !== row.rowId))}
          >
            Remove {groupLabel.toLowerCase()} row
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { rowId: newRowId(), values: {} }])}>
        Add {groupLabel.toLowerCase()}
      </button>
    </div>
  );
}
