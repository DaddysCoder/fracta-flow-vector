import { ReleasedDocumentImmutableError } from "./errors.js";

export interface Approval {
  by: string;
  at: string;
}

/**
 * One version of a document instance. Once released, a version is
 * immutable — the only way to change its content afterwards is
 * `correctDocument`, which produces a new draft successor version that
 * preserves dependencies, approvals, source lineage, and the template
 * hash it was generated against.
 */
export interface DocumentVersion {
  /** Instance id of this specific version. */
  id: string;
  /** Document type id (registry document id, e.g. "09"). */
  documentType: string;
  version: number;
  status: "draft" | "released";
  releasedAt: string | null;
  /** Instance ids of other documents this version depends on. */
  dependencies: string[];
  approvals: Approval[];
  /** Instance ids this version's content was carried/derived from. */
  sourceLineage: string[];
  templateHash: string;
  /** Instance id of the version this one corrects, if any. */
  predecessorVersion?: string;
}

export function createDraftVersion(input: {
  id: string;
  documentType: string;
  templateHash: string;
  dependencies?: string[];
  sourceLineage?: string[];
}): DocumentVersion {
  return {
    id: input.id,
    documentType: input.documentType,
    version: 1,
    status: "draft",
    releasedAt: null,
    dependencies: input.dependencies ?? [],
    approvals: [],
    sourceLineage: input.sourceLineage ?? [],
    templateHash: input.templateHash,
  };
}

function assertMutable(doc: DocumentVersion, action: string): void {
  if (doc.status === "released") {
    throw new ReleasedDocumentImmutableError(doc.id, action);
  }
}

/** Records an approval against a draft. Throws if the document is already released. */
export function approve(doc: DocumentVersion, approval: Approval): DocumentVersion {
  assertMutable(doc, "approve");
  return { ...doc, approvals: [...doc.approvals, approval] };
}

/** Releases a draft. Once released, the version is immutable. */
export function release(doc: DocumentVersion, releasedAt: string): DocumentVersion {
  assertMutable(doc, "release");
  return { ...doc, status: "released", releasedAt };
}

/**
 * A correction never edits a released version — it creates a new draft
 * successor that carries forward dependencies, approvals, source
 * lineage, and the template hash, and records which version it corrects.
 */
export function correctDocument(released: DocumentVersion, newVersionId: string): DocumentVersion {
  if (released.status !== "released") {
    throw new ReleasedDocumentImmutableError(released.id, "correct a document that was never released");
  }
  return {
    id: newVersionId,
    documentType: released.documentType,
    version: released.version + 1,
    status: "draft",
    releasedAt: null,
    dependencies: [...released.dependencies],
    approvals: [...released.approvals],
    sourceLineage: [...released.sourceLineage, released.id],
    templateHash: released.templateHash,
    predecessorVersion: released.id,
  };
}
