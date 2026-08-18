# Fracta Flow — PBS workflow: handover

## What this is

A workflow system for authoring NDIS Positive Behaviour Support (PBS)
documents in Australia. Three pathways — `no_rp` (no restrictive
practice), `interim`, `comprehensive` — govern which of 9 documents
exist and in what order. The whole schema (which fields exist, which
document/section asks each one, staleness policy, cross-document reuse,
evidence relationships) lives in `@pbs/registry` as data, not code.

Two deployment modes matter throughout: **standalone** (no account, no
other tool, no network — MD-005/MD-006, "correct, not degraded") and
**connected** (one shared participant record, enforced gates). Stage 9
(in progress) is standalone-only; connected mode is Stage 11, not
started.

## Repo layout

- `packages/registry` — data + validator only, no logic.
  `documents.json` (9 docs, their sections, pathways), `fields.json`
  (95 fields: id, tier 0-3, type, askedIn/rendersIn/informs,
  staleness, transition policy, pathways), `pathways.json` (RRP states
  and gates), `validate.mjs` (run it: `node
  packages/registry/src/validate.mjs`).
- `packages/core` — pure, no I/O, no DOM, no Node-only built-ins (must
  load unmodified in a browser bundle). `resolve.ts` (the tiered
  prefill engine), `gates.ts`, `ledger.ts`, `rrp.ts`, `versions.ts`,
  `triage.ts`, `capabilities.ts`.
- `packages/ui` — Vite + React. `FormRenderer.tsx` (the ONE generic
  renderer, dispatches purely by field type), `fields/` (per-type
  controls + repeatable groups), `visibility.ts` (conditional logic as
  data), `ReferralForm.tsx`/`ReferralApp.tsx` (the Stage 8 reference
  form — Stage 9 clones this pattern, not the component).
- `packages/export` — DOCX rendering (Node-buffer and browser-blob
  variants), `brand.ts` (Fracta Flow / provider brand modes).

## Decisions that aren't obvious from reading the code cold

- **Field tier is intrinsic**, read from the registry (`FieldDef.tier`),
  never inferred by `resolve()`. 0 identity, 1 perishable fact,
  2 observation, 3 interpretation.
- **`informs` targets SECTION ids, not field ids.** A field whose
  `informs` includes section X is evidence for whatever tier3 field is
  being authored at X — it does not render there.
- **The "source register" is real data**, not a special construct: the
  repeatable field `source.entry` (askedIn `03.1`). Detected by
  matching the owning document's title ("Source and Consultation
  Register"), not by hardcoding the field id — see
  `packages/core/test/fixtures.ts`'s `registerSectionIds` /
  `isCaseRegister`. Every recorded row of it is always tier3 evidence,
  regardless of `informs`.
- **A value authored directly in the target document always renders**
  (promotes to the tier0 bucket) regardless of the field's own
  registry tier — "you already answered this here, don't re-prompt."
- **A tier3 field is blank+evidence only when it's being asked
  (`askedIn`) in the current document.** If it's only quoted elsewhere
  via `rendersIn` (already finalized, e.g. `goals` flowing from the
  BSA/FBA into the final BSP), it renders like tier0 instead of coming
  back null.
- **Standalone mode** (`caps.crossDocumentPrefill = false`) restricts
  tier0 to locally-authored values only and empties tier1/2/3
  entirely. This is deliberate, not a bug — see `capabilities.ts`'s
  own doc comment.
- **Gates always run.** `caps.transitionLedger = false` only downgrades
  a violation's `severity` from `"blocking"` to `"guidance"` — it is
  never silently dropped. See `gates.ts`.
- **`ledger.ts`'s `hashValue` is a plain FNV-1a hash, not crypto.** It
  used to import `node:crypto`; that broke loading `@pbs/core` from
  the Vite browser bundle (Vite externalizes Node builtins and throws
  on access even for an unused named import). It only needs to detect
  changes, not resist attack, so the swap cost nothing real.
- **`fields.json` was extended beyond the original registry fixture**:
  14 new tier0 fields for Referral's sections D/E/G/H (which had none)
  plus the conditional-trigger fields the form's logic needs. Registry
  still validates clean — always re-run
  `node packages/registry/src/validate.mjs` after touching it.

## How to run things

```
pnpm install
pnpm -r run test          # 85 tests as of this handover
pnpm -r run typecheck
node packages/registry/src/validate.mjs
pnpm --filter @pbs/ui run dev   # http://localhost:5173, the Referral form
```

## Status against the user's own staged spec

| Stage | What | Status |
|---|---|---|
| — | `resolve()` core algorithm | Done, 30 tests |
| 5 | Transition ledger, gates, RRP flags, document versioning | Done, 33 tests |
| 8 | 01 Referral reference form | Done, verified live in-browser (screenshots + zip sent), **signed off by the user** |
| 9 | Clone shell to forms 02–09 | **In progress** — see below |
| 10 | Standalone QA over all 9 forms | Not started |
| 11 | Connected capability set live (crossDocumentPrefill, enforced ledger, identity vault, pathway state machine) | Not started |
| 12 | Login, tenancy, persistent storage, encryption at rest | Not started |
| 13 | Release review | Not started |

## Stage 9 — where it stands right now

Registry audit of each document's own `askedIn` fields is done (see
table below). The instruction is explicit: **"If you find yourself
writing bespoke components for a form, the shell is wrong — fix the
shell instead."** So the plan is a generic `DocumentForm`/`DocumentApp`
pair (refactored out of `ReferralForm`/`ReferralApp`), with each of the
8 remaining forms being a thin config object (documentId, visibility
rules, required fields, any submit-time behavior) — not a new
component.

Per-form own-field counts already in the registry: 02 Triage (15
fields, incl. `triage.rrp_status`, `triage.outcome`, the risk matrix),
03 Source Register (1: `source.entry`), 04 BSA/FBA (34, across all 10
sections), 05 Data Capture (1: `incident.observed`), 06 Strategy
Instance (7, all `strategy_instance` group + `plan.skill_development`),
07 No-RP BSP (**0** — it only renders tier3 content quoted from 04/06,
confirmed nothing is askedIn `07.x`), 08 Interim (2:
`rrp.safeguards_implemented`, `interim.safeguard_rationale`), 09
Comprehensive (4, all `rrp` group in `09.13`).

Gaps identified, not yet built:
- **02 outcome branching**: `triage.outcome` exists as a single select,
  but the four branches (accept / request information / waitlist /
  decline) each need their own required follow-up fields, and decline
  specifically needs a practitioner-authored reason field. Likely need
  2-4 new registry fields plus visibility rules keyed on
  `triage.outcome`'s value.
- **06 Strategy Instance pinning**: "pins Strategy Entry id AND
  version. Library updates must never silently change an existing
  participant strategy." No Strategy Library concept exists yet
  anywhere in the repo — needs a small new type
  (`StrategyLibraryEntry { id, version, ... }`) and a pinning function
  in `@pbs/core`, plus a test proving an already-created instance keeps
  its old pinned version after the library entry changes.
- **07 zero-RRP-content test**: not yet written. Should assert none of
  the fields in scope for document `07` belong to the `rrp` group.
- **08 `unassessed` flag**: `InterimSafeguard.unassessed` already
  exists as a type in `gates.ts`, but nothing in the registry or UI
  surfaces it as an actual field on a safeguard row yet. Likely just
  needs one more registry field (`interim.safeguard_unassessed`, group
  `interim_safeguard`, askedIn `08.9`) so it flows through the generic
  shell with no bespoke code.
- **fba.approved guidance banner**: gates.ts already supports this
  (standalone mode → guidance severity); the UI just needs to call
  `checkAuthoringGates` on the 04/06/07/09 forms and show the resulting
  messages as a banner. Not wired yet.
- **09 "full BSA/FBA not repeated"**: already true structurally — 04.x
  fields are never askedIn `09.x`. In standalone mode there is no
  cross-document access at all, so this note is really a warning for
  Stage 11 (connected mode) not to duplicate the BSA/FBA question set
  into document 09 — nothing to build for Stage 9 specifically beyond
  not accidentally doing that.
- **05 "standalone rows never alter the BSA/FBA"**: already true by
  construction (each document instance has its own `sourceDocument`
  id; nothing cross-writes). Worth a short test asserting it rather
  than new code.

## Open thread, unresolved

A mid-conversation message referenced `README.md`, `CONTRADICTIONS.md`,
and a `docs/` directory that don't match anything actually asked for in
this session (nobody requested them here, and I never claimed they
existed). I flagged it to the user as inconsistent — possibly crossed
wires with a different agent session — and have not acted on it. If you
pick this up and that context resolves, note it here.

## Branches

`main` and `claude/pbs-core-resolve-function-obclyo` are currently
identical (both at commit `4146184` as of this handover — the resolve()
+ registry + gates/ledger + Stage 8 Referral form work). The repo had no
`main` until the user asked for one; it was created fresh from the
feature branch tip, not merged in the conflict-resolution sense. Keep
pushing feature work to `claude/pbs-core-resolve-function-obclyo`
unless told otherwise, and re-sync `main` when asked.
