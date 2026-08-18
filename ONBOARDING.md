# Fracta Flow — PBS workflow: handover

**Read this whole file before doing anything.** Multiple Claude Code
sessions have been working this same repo concurrently (see "Multiple
sessions" below) — assumptions that would be safe in a single-session
project are not safe here.

## What this is

A workflow system for authoring NDIS Positive Behaviour Support (PBS)
documents in Australia. Three pathways — `no_rp` (no restrictive
practice), `interim`, `comprehensive` — govern which of 9 documents
exist and in what order. The whole schema (which fields exist, which
document/section asks each one, staleness policy, cross-document reuse,
evidence relationships) lives in `@pbs/registry` as data, not code.

Two deployment modes matter throughout: **standalone** (no account, no
other tool, no network — MD-005/MD-006, "correct, not degraded, its own
product edition") and **connected** (one shared participant record,
enforced gates). See "Open decision" below — this is not fully settled.

## Multiple sessions — read this first

This repo has had at least three Claude Code sessions active on it,
plus an unrelated `task-tracker` branch (a totally different Next.js/
Prisma/Postgres app — ignore it, not part of this project). Concretely:

- This session built: `resolve()`, the real registry pull-in, gates/
  ledger/rrp/versions, and the Stage 8 Referral form (01).
- A second session (PR #1, merged) built Forms 02 (Triage) and 03
  (Source Register), `resolvePathway()`, and started `CONTRADICTIONS.md`
  — a log file for exactly this kind of cross-session/cross-doc conflict,
  by house rule now: **never silently resolve a contradiction, log it
  and surface it.** Read `CONTRADICTIONS.md` in full before building
  anything on documents 02+; it already has four entries, one of which
  (numbering-scheme collision) affects how you interpret any "Stage N"
  reference anywhere, including in this file.
- A message appeared mid-conversation in THIS session that turned out to
  be written by that second session, addressed to the human user ("Pol"
  / Polina) — not a prompt injection, just genuine cross-talk. If you see
  something in this session that reads like it's addressed to someone
  else or references work you don't recognize, don't assume it's an
  attack — but don't act on it as if it were addressed to you either.
  Flag it and ask.
- PR #2 was auto-created by the Claude Code UI wrapping this branch
  (`claude/pbs-core-resolve-function-obclyo`) against `main`, and was
  merged by the user despite a **failing Vercel deployment check**
  (`state: failure`, project name shown as "wayfare" in the check,
  which doesn't match this repo — likely a stale/misconfigured Vercel
  project link, or auto-detection failing on a pnpm workspace with no
  root-level deployable app). Not investigated further. If Vercel
  matters to this project, someone needs to either configure
  `vercel.json` to point at `packages/ui` or disconnect the integration.
- `main` and `claude/pbs-core-resolve-function-obclyo` are in sync as of
  this handover (`main` at merge commit `f1ba04b`, wrapping everything
  through `9f94ab4`). Keep pushing feature work to
  `claude/pbs-core-resolve-function-obclyo` — the Claude Code UI already
  has PR #2 pattern established (new pushes update the existing PR
  rather than needing a new one), though PR #2 itself is now merged, so
  the next push will auto-open a new PR unless told otherwise.

## Repo layout

- `packages/registry` — data + validator only, no logic.
  `documents.json` (9 docs, their sections, pathways), `fields.json`
  (95 fields: id, tier 0-3, type, askedIn/rendersIn/informs, staleness,
  transition policy, pathways), `pathways.json` (RRP states and gates),
  `validate.mjs` (run it: `node packages/registry/src/validate.mjs`).
- `packages/core` — pure, no I/O, no DOM, no Node-only built-ins (must
  load unmodified in a browser bundle). `resolve.ts` (the tiered
  prefill engine), `gates.ts`, `ledger.ts`, `rrp.ts`, `versions.ts`,
  `triage.ts`, `capabilities.ts`, `pathway.ts` (`resolvePathway()`,
  added by the other session).
- `packages/ui` — Vite + React. `FormRenderer.tsx` (the ONE generic
  renderer, dispatches purely by field type — now also handles
  read-only quoted fields and group-level visibility, added by the
  other session), `fields/` (per-type controls, `ReadOnlyField`,
  repeatable groups), `visibility.ts` (conditional logic as data),
  `registryAdapter.ts` (registry → core type translation, added by the
  other session — check this against `packages/core/test/fixtures.ts`,
  which does the same job for tests; they should probably converge),
  `ReferralForm.tsx`/`TriageForm.tsx`/`SourceForm.tsx` +
  `ReferralApp.tsx` (docs 01/02/03, chained in one app).
- `packages/export` — DOCX rendering (Node-buffer and browser-blob
  variants), `brand.ts` (Fracta Flow / provider brand modes). Now
  handles repeatable fields as one paragraph per row (fixed by the
  other session — see `flattenValuesForExport`).

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
  Register"), not by hardcoding the field id. Every recorded row of it
  is always tier3 evidence, regardless of `informs`.
- **A value authored directly in the target document always renders**
  (promotes to the tier0 bucket) regardless of the field's own registry
  tier — "you already answered this here, don't re-prompt."
- **A tier3 field is blank+evidence only when it's being asked
  (`askedIn`) in the current document.** If it's only quoted elsewhere
  via `rendersIn` (already finalized, e.g. `goals` flowing from the
  BSA/FBA into the final BSP), it renders like tier0 instead of coming
  back null.
- **Standalone mode** (`caps.crossDocumentPrefill = false`) restricts
  tier0 to locally-authored values only and empties tier1/2/3 entirely.
  This is deliberate, not a bug — see `capabilities.ts`'s own doc
  comment. **This is currently violated by `TriageForm`/`SourceForm`
  hardcoding `CAPABILITIES.connected` — see "Open decision" below.**
- **Gates always run.** `caps.transitionLedger = false` only downgrades
  a violation's `severity` from `"blocking"` to `"guidance"` — it is
  never silently dropped. See `gates.ts`.
- **`ledger.ts`'s `hashValue` is a plain FNV-1a hash, not crypto.** It
  used to import `node:crypto`; that broke loading `@pbs/core` from the
  Vite browser bundle. It only needs to detect changes, not resist
  attack, so the swap cost nothing real.
- **`fields.json` was extended beyond the original registry fixture**:
  14 new tier0 fields for Referral's sections D/E/G/H (which had none)
  plus conditional-trigger fields, and (by the other session)
  `triage.rrp_status`/`triage.outcome` option lists. Registry still
  validates clean — always re-run
  `node packages/registry/src/validate.mjs` after touching it.
- **`resolvePathway()`** (`packages/core/src/pathway.ts`, other session)
  maps RRP classification (`none`/`possible_unclear`/`confirmed`) to
  pathway (`no_rp`/`interim`/`comprehensive`). `possible_unclear` →
  `interim`, deliberately (treated as in-RP pending investigation, not
  no-RP) — see `CONTRADICTIONS.md` #2 for the full reasoning, confirmed
  by the user.

## Open decision — NOT YET IMPLEMENTED, this is the actual next step

`TriageForm` and `SourceForm` (docs 02/03) hardcode
`CAPABILITIES.connected` and call `resolve()` against a shared
in-memory case record chained from document 01. This lets cross-
document prefill work, but it means those two forms cannot function
without another tool's data already present — which directly
contradicts the (not-yet-built) Stage 10 QA requirement that every one
of the 9 forms opens and completes standalone, "no other tool."

**Discussed with the user. Their steer: standalone is correct** — the
staged spec sequences it that way on purpose (clone the shell standalone
→ QA all nine standalone → THEN turn connected on uniformly as a mode
switch, no new forms, per the later stage). Connected-mode chaining
before that point bakes `CAPABILITIES.connected` into two specific forms
as a hardcoded constant rather than a deployment-mode toggle, which
would have to be unwound later rather than just flipped.

**What's left to do, exactly:**
1. Switch `TriageForm`/`SourceForm` off hardcoded `CAPABILITIES.connected`
   back to standalone (matching `ReferralForm`'s pattern).
2. Log the reversal in `CONTRADICTIONS.md` (the other session's own
   house rule — don't silently redo their call, write down why).
3. Decide what "quoted from an earlier document" fields should show in
   standalone mode when there's no earlier document to quote from — the
   other session's `ReadOnlyField` shows "Not yet available" for a
   missing quoted value, which may already be the right answer; verify
   it before assuming.
4. Continue documents 04–09 the same (standalone) way.

**This was the live task when this handover was written — nothing
above has been implemented yet.** Start here.

## Status against the user's own staged spec

(Per `CONTRADICTIONS.md` #1: this repo's per-document stage numbering
and a separate roadmap doc's product-level stage numbering collide.
This table uses the per-document numbering, i.e. what this session and
PR #1 both actually used.)

| Stage | What | Status |
|---|---|---|
| — | `resolve()` core algorithm | Done, 30 tests |
| 5 | Transition ledger, gates, RRP flags, document versioning | Done |
| 8 | 01 Referral reference form | Done, verified live in-browser, **signed off by the user** |
| 9 | Clone shell to forms 02–09 | **In progress.** 02/03 built by another session but with the connected-vs-standalone issue above; 04–09 not started |
| 10 | Standalone QA over all 9 forms | Not started |
| 11 | Connected capability set live (crossDocumentPrefill, enforced ledger, identity vault, pathway state machine) | Not started |
| 12 | Login, tenancy, persistent storage, encryption at rest | Not started |
| 13 | Release review | Not started |

## Gaps identified for documents 04–09, not yet built

- **02 outcome branching**: `triage.outcome` exists as a single select
  (now with accept/request_information options per the other session),
  but the full branch set (accept / request information / waitlist /
  decline) each need their own required follow-up fields, and decline
  specifically needs a practitioner-authored reason field, never
  algorithmic. Likely needs 2-4 more registry fields plus visibility
  rules keyed on `triage.outcome`'s value.
- **06 Strategy Instance pinning**: "pins Strategy Entry id AND version.
  Library updates must never silently change an existing participant
  strategy." No Strategy Library concept exists anywhere yet — needs a
  small new type (`StrategyLibraryEntry { id, version, ... }`) and a
  pinning function in `@pbs/core`, plus a test proving an already-
  created instance keeps its old pinned version after the library entry
  changes.
- **07 zero-RRP-content test**: not yet written. Should assert none of
  the fields in scope for document `07` belong to the `rrp` group.
- **08 `unassessed` flag**: `InterimSafeguard.unassessed` already exists
  as a type in `gates.ts`, but nothing in the registry or UI surfaces it
  as an actual field on a safeguard row yet. Likely just needs one more
  registry field (`interim.safeguard_unassessed`, group
  `interim_safeguard`, askedIn `08.9`) so it flows through the generic
  shell with no bespoke code.
- **fba.approved guidance banner**: `gates.ts` already supports this
  (standalone mode → guidance severity); the UI just needs to call
  `checkAuthoringGates` on the 04/06/07/09 forms and show the resulting
  messages as a banner. Not wired yet.
- **09 "full BSA/FBA not repeated"**: already true structurally — 04.x
  fields are never askedIn `09.x`. Nothing to build here beyond not
  accidentally duplicating the BSA/FBA question set into document 09
  later, in Stage 11.
- **05 "standalone rows never alter the BSA/FBA"**: already true by
  construction (each document instance has its own `sourceDocument` id).
  Worth a short test asserting it rather than new code.
- Also see `CONTRADICTIONS.md` #3 (missing "immediate danger" field for
  `health.triage_screen`'s visibility condition) and #4 (source register
  is far less structured than its narrative spec) — both open, both
  will likely resurface while building 04+.

## How to run things

```
pnpm install
pnpm -r run test          # 105 tests as of this handover
pnpm -r run typecheck
node packages/registry/src/validate.mjs
pnpm --filter @pbs/ui run dev   # http://localhost:5173, docs 01→02→03 chained
```

## Branches

`main` and `claude/pbs-core-resolve-function-obclyo` are in sync as of
this handover. Keep pushing feature work to the feature branch.
