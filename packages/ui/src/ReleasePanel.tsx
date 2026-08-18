import { correctDocument, release, type DocumentVersion, type GateViolation } from "@pbs/core";
import { GateBanner } from "./DocumentShell.js";

export interface ReleasePanelProps {
  version: DocumentVersion;
  onVersionChange: (version: DocumentVersion) => void;
  /** Release-time gate violations, already deduped. */
  violations: GateViolation[];
  now: () => Date;
  /** Id for the successor draft a correction creates. */
  newVersionId: () => string;
  unlockHint?: string;
}

/**
 * Release and correction, on the existing machinery in `versions.ts`.
 *
 * A released version is immutable — `release()` refuses to touch it
 * again, and the only way to change its content afterwards is
 * `correctDocument()`, which produces a *successor draft* carrying
 * dependencies, approvals, source lineage and the template hash forward.
 * Release gates are re-checked here, not trusted from authoring time.
 */
export function ReleasePanel({
  version,
  onVersionChange,
  violations,
  now,
  newVersionId,
  unlockHint,
}: ReleasePanelProps) {
  const blocking = violations.some((v) => v.severity === "blocking");

  return (
    <section className="form-section no-print" aria-labelledby="release-panel">
      <h2 className="section-title" id="release-panel">
        Release
      </h2>

      <GateBanner violations={violations} unlockHint={unlockHint} />

      {version.status === "released" ? (
        <>
          <p role="status">
            Version {version.version} released at {version.releasedAt}. It is immutable — corrections
            create a successor draft rather than editing it.
          </p>
          <button
            type="button"
            onClick={() => onVersionChange(correctDocument(version, newVersionId()))}
          >
            Create correction (successor draft)
          </button>
        </>
      ) : (
        <>
          <p className="field-note">
            Draft version {version.version}
            {version.predecessorVersion
              ? ` — correcting ${version.predecessorVersion}, carrying its approvals and lineage forward.`
              : "."}{" "}
            Releasing freezes this version permanently.
          </p>
          <button
            type="button"
            disabled={blocking}
            onClick={() => onVersionChange(release(version, now().toISOString()))}
          >
            Release this plan
          </button>
          {blocking && (
            <p className="field-note">
              Release is blocked while the gates above are unmet. Nothing carries quietly.
            </p>
          )}
        </>
      )}
    </section>
  );
}
