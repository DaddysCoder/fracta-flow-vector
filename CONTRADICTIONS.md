# Contradictions log

Per the standing build rule: never silently resolve a contradiction between docs —
log it here and surface it, rather than picking a side.

## 1. Two incompatible "Stage N" numbering schemes (open — not yet reconciled)

**Found:** 2026-08-17.

This repo's own history (git commits, task briefs) numbers build stages 1-9+ at the
level of *one document or function each* — e.g. "Stage 8: build the 01 Referral form,"
"Stage 9: forms 02-09," "Stage 4: resolvePathway() and the pathway state machine."

`docs/bsp-modular-product-architecture-proposal-v1.md` §6 numbers a *different*,
much coarser set of stages for the whole product build:

- Stage 1 — implementation contracts (freeze templates, convert schema/gates to typed
  contracts, define the module registry)
- Stage 2 — shared platform shell (tenancy, auth, Identity Vault, audit/release)
- Stage 3 — make the calculator Module 1
- Stage 4 — **first clinical vertical slice**: referral + triage, the pathway state
  machine + RRP classification-review gate, source register + combined
  Assessment/FBA, FBA approval, Strategy Entry/Instance authoring, and a fixed-order
  no-RP BSP export — all of it, as one stage
- Stage 5 — complete the PBS workflow (session loop, snapshots, progress reports)
- Stage 6 — integrations, then CRM

The repo's "Stage 4" (this session: resolvePathway() + the pathway state machine
alone) is a small piece of the roadmap doc's "Stage 4" (an entire end-to-end vertical
slice including forms 01, 02, 03, 04, 06, and the no-RP export). Same name, same date
context (9 Aug 2026), very different scope. Anyone reading both without this note
would reasonably assume they're the same milestone and conclude far more is finished
than actually is.

**Not resolved here because:** picking which numbering is authoritative (or mapping
one onto the other) is an architecture/planning call, not an implementation one.
Flagging so Pol can decide whether the repo's per-document stage numbering should be
renamed (e.g. "steps") to stop colliding with the roadmap doc's product-level stages,
or whether the roadmap doc's stages should be treated as non-binding narrative only.

## 2. `Pathway` type had no representation for "RRP status not yet classified" (resolved)

**Found and resolved:** 2026-08-17, during Stage 4 (resolvePathway implementation).

`packages/registry/src/pathways.json` `states` has three RRP classifications:
`none`, `possible_unclear`, `confirmed`. `packages/core/src/gates.ts`'s `Pathway` type
has only three values: `no_rp`, `interim`, `comprehensive` — no value for "under
classification review." `docs/bsp-schema-interface-and-strategy-approval-pack-v2.1.md`
§3.1 independently confirms `possible_rp_review` is a real, necessary intermediate
state (blocks final no-RP release; permits classification work only).

**Resolution (Pol, 2026-08-17):** `possible_unclear` is treated as in-RP and under
investigation, not as no-RP. `resolvePathway()` (`packages/core/src/pathway.ts`)
resolves it to the `interim` pathway value for gating purposes, while still surfacing
the registry's own `blocks`/`forbids` lists for that classification (which already
correctly withhold documents 06 and 07 pending resolution, distinct from the pathway
value itself). No change to the `Pathway` type was needed. See the doc comment on
`resolvePathway` for the full reasoning.

## 3. `health.triage_screen`'s own note names a condition with no field behind it (open — not blocking)

**Found:** 2026-08-17, during Stage 9 (Form 02 Practitioner Triage).

The registry field `health.triage_screen` (02.F) carries this note: "Conditional. Shown
only when RRP is identified or immediate danger is flagged." `triage.rrp_status`
provides the RRP-identified half. There is no other field anywhere in the registry
representing "immediate danger" as its own captured signal — the only numeric risk
figure that exists, `risk.matrix_rating`, is explicitly marked "DERIVED, read-only...
it must not gate, rank or set the pathway" (MD-019), so using it to gate this field's
visibility would violate that rule directly.

**Not resolved here because:** this is a missing registry field, not an implementation
choice — inventing a synthetic "immediate danger" flag to satisfy the note would be
exactly the kind of guess this log exists to avoid. `packages/ui/src/triage.ts`
currently implements only the RRP-identified half of the condition (visible when
`triage.rrp_status` is `possible_unclear` or `confirmed`); the "immediate danger" half
is unimplemented pending either a new registry field or a decision that the RRP half
alone is sufficient.

## Docs that were missing entirely as of session start (context, not a contradiction)

`README.md`, `docs/pbs-canonical-reconciliation.md`,
`docs/pbs-conditional-logic-form-pack.md`, `docs/pbs-field-registry-and-build-stages.md`
did not exist anywhere in this repo's git history on any branch as of 2026-08-17, despite
being treated as settled, already-written architecture in the task brief that opened this
session. Confirmed via local git history and the GitHub API directly (no PRs, no issues,
no other branches). Not fabricated or reconstructed. Three other planning documents were
supplied mid-session by Pol and saved to `docs/` — see their headers for scope and status —
but they are not confirmed to be those missing files or the referenced "Master Decision
Chart v1.0 (9 Aug 2026)" (which uses `MD-0xx` numbering not present in the supplied docs).
