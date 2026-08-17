import { describe, expect, it } from "vitest";
import { createTriageTask } from "../src/triage.js";

function baseInput() {
  return {
    id: "task-1",
    referralDocumentId: "referral-1",
    createdAt: "2026-08-17T00:00:00Z",
    urgent: false,
    fields: [
      { fieldId: "referral.reason", value: "Escalating property damage.", sourceDocument: "referral-1", sourceDate: "2026-08-17" },
    ],
  };
}

describe("createTriageTask", () => {
  it("routes a non-urgent referral to standard priority", () => {
    const task = createTriageTask(baseInput());
    expect(task.priority).toBe("standard");
  });

  it("routes an urgent referral to human priority review — not an acceptance or pathway decision", () => {
    const task = createTriageTask({ ...baseInput(), urgent: true });
    expect(task.priority).toBe("human_priority_review");
    // The shape has no field for acceptance or clinical pathway at all.
    expect(task).not.toHaveProperty("accepted");
    expect(task).not.toHaveProperty("pathway");
  });

  it("carries the referral's answers through untouched", () => {
    const input = baseInput();
    const task = createTriageTask(input);
    expect(task.fields).toEqual(input.fields);
  });

  it("is pure — identical input produces identical output", () => {
    const input = baseInput();
    expect(createTriageTask(input)).toEqual(createTriageTask(input));
  });
});
