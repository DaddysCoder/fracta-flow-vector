import { describe, expect, it } from "vitest";
import { ReleasedDocumentImmutableError } from "../src/errors.js";
import { approve, correctDocument, createDraftVersion, release } from "../src/versions.js";

function draft() {
  return createDraftVersion({
    id: "bsp-2026-v1",
    documentType: "09",
    templateHash: "template-hash-09-v3",
    dependencies: ["bsa-2026", "referral-1"],
    sourceLineage: ["bsa-2026"],
  });
}

describe("versions — draft lifecycle", () => {
  it("starts as an unreleased draft with no approvals", () => {
    const v = draft();
    expect(v.status).toBe("draft");
    expect(v.releasedAt).toBeNull();
    expect(v.approvals).toEqual([]);
    expect(v.version).toBe(1);
  });

  it("accumulates approvals without mutating the input", () => {
    const v1 = draft();
    const v2 = approve(v1, { by: "senior-practitioner-1", at: "2026-08-01T00:00:00Z" });
    expect(v1.approvals).toEqual([]);
    expect(v2.approvals).toEqual([{ by: "senior-practitioner-1", at: "2026-08-01T00:00:00Z" }]);
  });

  it("releases a draft, stamping releasedAt", () => {
    const released = release(draft(), "2026-08-10T00:00:00Z");
    expect(released.status).toBe("released");
    expect(released.releasedAt).toBe("2026-08-10T00:00:00Z");
  });
});

describe("versions — released documents are immutable", () => {
  it("refuses to approve a released document", () => {
    const released = release(draft(), "2026-08-10T00:00:00Z");
    expect(() => approve(released, { by: "x", at: "2026-08-11T00:00:00Z" })).toThrow(
      ReleasedDocumentImmutableError,
    );
  });

  it("refuses to release an already-released document", () => {
    const released = release(draft(), "2026-08-10T00:00:00Z");
    expect(() => release(released, "2026-08-12T00:00:00Z")).toThrow(ReleasedDocumentImmutableError);
  });

  it("refuses to correct a document that was never released", () => {
    expect(() => correctDocument(draft(), "bsp-2026-v2")).toThrow(ReleasedDocumentImmutableError);
  });
});

describe("versions — a correction creates a successor, never edits in place", () => {
  const original = release(approve(draft(), { by: "senior-practitioner-1", at: "2026-08-01T00:00:00Z" }), "2026-08-10T00:00:00Z");
  const successor = correctDocument(original, "bsp-2026-v2");

  it("leaves the original version untouched", () => {
    expect(original.status).toBe("released");
    expect(original.version).toBe(1);
  });

  it("is a new draft, one version ahead", () => {
    expect(successor.status).toBe("draft");
    expect(successor.releasedAt).toBeNull();
    expect(successor.version).toBe(2);
    expect(successor.id).toBe("bsp-2026-v2");
  });

  it("preserves dependencies, approvals, and template hash from the original", () => {
    expect(successor.dependencies).toEqual(original.dependencies);
    expect(successor.approvals).toEqual(original.approvals);
    expect(successor.templateHash).toBe(original.templateHash);
  });

  it("extends source lineage with the corrected version, and records its predecessor", () => {
    expect(successor.sourceLineage).toEqual([...original.sourceLineage, original.id]);
    expect(successor.predecessorVersion).toBe(original.id);
  });
});
