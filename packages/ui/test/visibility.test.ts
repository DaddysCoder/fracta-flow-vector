import { describe, expect, it } from "vitest";
import { isFieldVisible, requiredFieldIds, visibleFieldIds, type VisibilityRule } from "../src/visibility.js";

const RULES: VisibilityRule[] = [
  {
    id: "referrer-not-participant",
    targetFieldIds: ["referrer.relationship_to_participant", "referrer.awareness_of_referral"],
    when: (v) => v["referrer.is_participant"] === "no",
  },
  {
    id: "guardian-identified",
    targetFieldIds: ["guardian.contact"],
    when: (v) => Boolean(v["guardian.name_role"]),
  },
  {
    id: "existing-bsp-yes",
    targetFieldIds: ["existing.plan_type", "existing.plan_date"],
    when: (v) => v["existing.bsp"] === "yes",
  },
  {
    id: "urgent-yes",
    targetFieldIds: ["referral.urgent_explanation"],
    when: (v) => v["referral.urgent"] === "yes",
    required: true,
  },
];

describe("visibility — referrer relationship questions", () => {
  it("are hidden when the referrer is the participant", () => {
    const values = { "referrer.is_participant": "yes" };
    expect(isFieldVisible("referrer.relationship_to_participant", RULES, values)).toBe(false);
  });

  it("appear once the referrer is not the participant", () => {
    const values = { "referrer.is_participant": "no" };
    expect(isFieldVisible("referrer.relationship_to_participant", RULES, values)).toBe(true);
    expect(isFieldVisible("referrer.awareness_of_referral", RULES, values)).toBe(true);
  });
});

describe("visibility — guardian contact", () => {
  it("stays hidden until a guardian/nominee is named", () => {
    expect(isFieldVisible("guardian.contact", RULES, {})).toBe(false);
    expect(isFieldVisible("guardian.contact", RULES, { "guardian.name_role": "" })).toBe(false);
  });

  it("appears once guardian.name_role has a value", () => {
    expect(isFieldVisible("guardian.contact", RULES, { "guardian.name_role": "Jamie Lee, parent" })).toBe(
      true,
    );
  });
});

describe("visibility — existing plan detail suppressed with no existing plan", () => {
  it("is hidden when existing.bsp is not yes", () => {
    for (const value of [undefined, "no", ""]) {
      const hidden = visibleFieldIds(RULES, { "existing.bsp": value });
      expect(hidden.has("existing.plan_type")).toBe(true);
      expect(hidden.has("existing.plan_date")).toBe(true);
    }
  });

  it("appears when existing.bsp is yes", () => {
    const values = { "existing.bsp": "yes" };
    expect(isFieldVisible("existing.plan_type", RULES, values)).toBe(true);
    expect(isFieldVisible("existing.plan_date", RULES, values)).toBe(true);
  });
});

describe("visibility — urgency explanation is conditionally required, never gates other fields", () => {
  it("is not required when the referral isn't urgent", () => {
    const required = requiredFieldIds(RULES, { "referral.urgent": "no" }, ["referral.reason"]);
    expect(required.has("referral.urgent_explanation")).toBe(false);
  });

  it("becomes required once urgent is yes", () => {
    const required = requiredFieldIds(RULES, { "referral.urgent": "yes" }, ["referral.reason"]);
    expect(required.has("referral.urgent_explanation")).toBe(true);
  });

  it("never adds funding status to the required set — funding uncertainty must never block submission", () => {
    const required = requiredFieldIds(RULES, { "referral.urgent": "yes" }, ["referral.reason"]);
    expect(required.has("referral.funding_status")).toBe(false);
  });
});
