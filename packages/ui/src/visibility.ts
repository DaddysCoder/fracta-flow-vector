/**
 * Conditional logic is data, not markup: a small set of rules the
 * FormRenderer applies generically, rather than bespoke per-field JSX.
 * Each rule says which fields to reveal (and optionally require) once a
 * predicate over the form's current values holds.
 */
export interface VisibilityRule {
  id: string;
  targetFieldIds: string[];
  when: (values: Record<string, unknown>) => boolean;
  /** When true, target fields become required for submission while visible. */
  required?: boolean;
}

export function visibleFieldIds(
  rules: VisibilityRule[],
  values: Record<string, unknown>,
): Set<string> {
  const hidden = new Set<string>();
  for (const rule of rules) {
    if (!rule.when(values)) {
      for (const id of rule.targetFieldIds) hidden.add(id);
    }
  }
  return hidden;
}

export function isFieldVisible(
  fieldId: string,
  rules: VisibilityRule[],
  values: Record<string, unknown>,
): boolean {
  return !visibleFieldIds(rules, values).has(fieldId);
}

export function requiredFieldIds(
  rules: VisibilityRule[],
  values: Record<string, unknown>,
  alwaysRequired: string[],
): Set<string> {
  const required = new Set(alwaysRequired);
  for (const rule of rules) {
    if (rule.required && rule.when(values)) {
      for (const id of rule.targetFieldIds) required.add(id);
    }
  }
  return required;
}
