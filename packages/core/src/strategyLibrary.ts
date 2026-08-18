/**
 * Strategy Library pinning.
 *
 * A Strategy Instance (document 06) is authored *from* a library entry,
 * but it is never a live reference to one: it pins the entry's id AND
 * version at the moment of creation. A later library update must never
 * silently change an existing participant's strategy — the registry says
 * the same thing in schema (`strategy.library_id`/`strategy.library_version`
 * do not allow the `update` or `revise` transitions), and this module is
 * the behavioural half of that rule.
 *
 * Pure, like the rest of `@pbs/core`: no clock read, no I/O. Callers pass
 * the timestamp in.
 */

/** One entry in the (host-supplied) Strategy Library. `@pbs/core` never
 * stores the library itself — it only knows the shape it pins from. */
export interface StrategyLibraryEntry {
  id: string;
  /** Opaque version token. Compared for equality only — never ordered,
   * since the library owns its own versioning scheme. */
  version: string;
  title: string;
}

/** The pin recorded on a Strategy Instance. Frozen on creation: nothing
 * in this module ever rewrites an existing pin. */
export interface PinnedStrategyRef {
  libraryId: string;
  libraryVersion: string;
  /** ISO 8601, caller-supplied. */
  pinnedAt: string;
}

export function pinStrategy(entry: StrategyLibraryEntry, pinnedAt: string): PinnedStrategyRef {
  return Object.freeze({
    libraryId: entry.id,
    libraryVersion: entry.version,
    pinnedAt,
  });
}

/**
 * True when the library entry this instance was pinned from has since
 * moved to a different version. This is *surfaced* to the practitioner,
 * never acted on: re-pinning is a deliberate new authoring act, not an
 * upgrade this code performs.
 */
export function isPinOutdated(pin: PinnedStrategyRef, current: StrategyLibraryEntry): boolean {
  return pin.libraryId === current.id && pin.libraryVersion !== current.version;
}
