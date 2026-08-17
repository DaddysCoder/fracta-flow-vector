import { describe, expect, it } from "vitest";
import { RRP_INDEPENDENT_FLAGS, createRrpRecord, setRrpFlag, type RrpRecord } from "../src/rrp.js";

describe("rrp — the five flags are independent", () => {
  it("starts with every flag false", () => {
    expect(createRrpRecord()).toEqual({
      authorisation: false,
      consent_consultation: false,
      commission_lodgement: false,
      monthly_reporting: false,
      practice_to_cease: false,
    });
  });

  it.each(RRP_INDEPENDENT_FLAGS)("setting %s never changes any other flag", (flag) => {
    const before = createRrpRecord();
    const after = setRrpFlag(before, flag, true);
    for (const other of RRP_INDEPENDENT_FLAGS) {
      if (other === flag) {
        expect(after[other]).toBe(true);
      } else {
        expect(after[other]).toBe(before[other]);
      }
    }
  });

  it("does not mutate the record it's given", () => {
    const before: RrpRecord = createRrpRecord();
    setRrpFlag(before, "authorisation", true);
    expect(before.authorisation).toBe(false);
  });

  it("composes: setting flags one at a time reaches the same state as setting them together", () => {
    let record = createRrpRecord();
    record = setRrpFlag(record, "authorisation", true);
    record = setRrpFlag(record, "practice_to_cease", true);
    expect(record).toEqual({
      authorisation: true,
      consent_consultation: false,
      commission_lodgement: false,
      monthly_reporting: false,
      practice_to_cease: true,
    });
  });
});
