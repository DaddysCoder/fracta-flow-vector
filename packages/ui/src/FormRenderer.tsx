import type { DocumentDef, FieldDef } from "@pbs/registry";
import { Field, ReadOnlyField } from "./fields/Field.js";
import { RepeatableGroup, type RepeatableRow } from "./fields/RepeatableGroup.js";
import {
  isFieldVisible,
  isGroupVisible,
  requiredFieldIds as computeRequired,
  type VisibilityRule,
} from "./visibility.js";

export interface FormValues {
  scalar: Record<string, unknown>;
  groups: Record<string, RepeatableRow[]>;
}

export function flattenValuesForExport(values: FormValues): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...values.scalar };
  for (const rows of Object.values(values.groups)) {
    for (const row of rows) {
      for (const [fieldId, value] of Object.entries(row.values)) {
        if (value === undefined || value === null || value === "") continue;
        const bucket = (flat[fieldId] as unknown[] | undefined) ?? [];
        bucket.push(value);
        flat[fieldId] = bucket;
      }
    }
  }
  return flat;
}

export interface FormRendererProps {
  document: DocumentDef;
  fields: FieldDef[];
  values: FormValues;
  onChange: (values: FormValues) => void;
  visibilityRules: VisibilityRule[];
  alwaysRequiredFieldIds: string[];
  newRowId: () => string;
  quotedFields?: FieldDef[];
  quotedValues?: Record<string, unknown>;
}

export function FormRenderer({
  document,
  fields,
  values,
  onChange,
  visibilityRules,
  alwaysRequiredFieldIds,
  newRowId,
  quotedFields = [],
  quotedValues = {},
}: FormRendererProps) {
  const required = computeRequired(visibilityRules, values.scalar, alwaysRequiredFieldIds);

  return (
    <>
      {document.sections.map((section) => {
        const sectionFields = fields.filter((f) => f.askedIn === section.id);
        const sectionQuoted = quotedFields.filter((f) => f.rendersIn.includes(section.id));
        if (sectionFields.length === 0 && sectionQuoted.length === 0) return null;

        const groupNames = [...new Set(sectionFields.filter((f) => f.group).map((f) => f.group!))].filter(
          (groupName) =>
            isGroupVisible(
              sectionFields.filter((f) => f.group === groupName).map((f) => f.id),
              visibilityRules,
              values.scalar,
            ),
        );
        const ungrouped = sectionFields.filter((f) => !f.group);

        return (
          <section className="form-section" key={section.id} aria-labelledby={`section-${section.id}`}>
            <h2 className="section-title" id={`section-${section.id}`}>
              {section.title}
            </h2>

            {sectionQuoted.map((field) => (
              <ReadOnlyField key={field.id} field={field} value={quotedValues[field.id]} />
            ))}

            {ungrouped
              .filter((field) => isFieldVisible(field.id, visibilityRules, values.scalar))
              .map((field) => (
                <Field
                  key={field.id}
                  field={field}
                  value={values.scalar[field.id]}
                  required={required.has(field.id)}
                  onChange={(value) =>
                    onChange({ ...values, scalar: { ...values.scalar, [field.id]: value } })
                  }
                />
              ))}

            {groupNames.map((groupName) => (
              <RepeatableGroup
                key={groupName}
                groupLabel={groupName.replace(/_/g, " ")}
                fields={sectionFields.filter(
                  (f) => f.group === groupName && isFieldVisible(f.id, visibilityRules, values.scalar),
                )}
                rows={values.groups[groupName] ?? []}
                requiredFieldIds={required}
                newRowId={newRowId}
                onChange={(rows) =>
                  onChange({ ...values, groups: { ...values.groups, [groupName]: rows } })
                }
              />
            ))}
          </section>
        );
      })}
    </>
  );
}

export function CardSectionsForm(props: FormRendererProps) {
  const { document, fields, quotedFields = [] } = props;
  return (
    <>
      {document.sections.map((section) => {
        const hasFields = fields.some((f) => f.askedIn === section.id);
        const hasQuoted = quotedFields.some((f) => f.rendersIn.includes(section.id));
        if (!hasFields && !hasQuoted) return null;
        return (
          <div className="card" key={section.id} style={{ marginBottom: "1.25rem" }}>
            <FormRenderer {...props} document={{ ...document, sections: [section] }} />
          </div>
        );
      })}
    </>
  );
}
