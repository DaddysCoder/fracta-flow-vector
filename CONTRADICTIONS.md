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

## 4. Source register/Consultation narrative spec is far richer than the one field the registry actually defines (open — not blocking)

**Found:** 2026-08-17, during Stage 10 (Form 03 Source and Consultation Register).

`docs/bsp-schema-interface-and-strategy-approval-pack-v2.1.md` §2.3 describes two
separate clinical record modules with many sub-attributes each:

- **Consultation** — one object per participant/stakeholder account, with role,
  relationship, setting/shift observed, mode, access support, consent/authority,
  exact report, examples, disagreements, follow-up.
- **Source register** — document/interview/observation/data source, author, date,
  location, relevance, reliability, currency, facts extracted, confirmation status.

The actual registry (`packages/registry/src/fields.json`) has exactly one field
askedIn `03.1` (the Source and Consultation Register's only section): `source.entry`,
a single repeatable `long_text` field with no sub-structure at all — one free-text
box per row, repeated. There is no field for author, date, reliability, consent, or
any of the other ~19 sub-attributes the doc pack names.

**Not resolved here because:** the doc pack is a narrative description of what the
module should conceptually hold, not a field-by-field schema — it gives no field
ids, tiers, types, or transition rules to implement against, unlike the concrete
per-field specs earlier stages built from. Inventing ~19 new fields (with tiers,
staleness, pathway, and transition metadata all guessed) to match the prose would
be exactly the kind of guess this log exists to avoid. Form 03 (`packages/ui/src/SourceForm.tsx`)
is built on the registry exactly as it stands today: one repeatable free-text entry
field, with the practitioner's identity and the document date quoted in read-only
alongside it. Flagging so Pol can decide whether `source.entry` should be split into
structured sub-fields (and if so, supply the concrete field list/schema) or whether
free-text entries are the intended design and the doc pack's breakdown is aspirational/future.

## 5. `TriageForm`/`SourceForm` hardcoded `CAPABILITIES.connected`, contradicting the standalone-first build order (resolved — reversed)

**Found:** 2026-08-17/18, carried over from the handover written at the end of Stage 9.

Forms 02 (`TriageForm`) and 03 (`SourceForm`), as built by the other session, called
`resolve()` for their quoted (`rendersIn`-only) fields against `CAPABILITIES.connected`
unconditionally, with an inline comment arguing these forms are "inherently the second
step of one governed case, never a standalone tool." That is a real design position —
but it directly contradicts the staged build order in this same handover: clone the
shell standalone for all nine documents, QA all nine standalone (Stage 10), and only
then turn connected-mode cross-document prefill on uniformly as a deployment-mode
switch (Stage 11), not per-form. Hardcoding `CAPABILITIES.connected` into two specific
forms bakes a mode choice into component code, which is exactly the kind of thing that
has to be unwound later instead of just flipped.

**Not silently redone:** flagged to Pol before touching either form.

**Resolution (Pol, 2026-08-17/18): standalone is correct**, matching the original
staged spec. Both forms now call `resolve()` against `CAPABILITIES.standalone`, same
as `ReferralForm`. Consequence, confirmed as intended rather than a regression: with
`crossDocumentPrefill: false`, every quoted (`rendersIn`-only) field on these two forms
resolves to no value, since none of their quoted fields are ever authored locally
(`askedIn` never matches this document for a quoted field, by definition) — so
`ReadOnlyField` renders "Not yet available" for all of them until Stage 11 turns
connected mode on. This was already `ReadOnlyField`'s designed fallback for a missing
quoted value (see its own doc comment), not new behaviour needed for this fix — it was
verified, not built, as part of this reversal.

## 6. `checkAuthoringGates`' `fba.approved` gate is self-referential on document 04 itself (open — not blocking, guidance-only in standalone)

**Found:** 2026-08-18, while building `BsaForm` (document 04, Combined BSA/FBA).

`packages/core/src/gates.ts`'s `checkAuthoringGates` sets `requiresFbaApproval` whenever
a document authors tier3 fields under a `no_rp` or `comprehensive` pathway
(`authorsTier3(targetDocument)`), and blocks/flags until `approvedGates` contains
`"fba.approved"`. Document 04 is the one document that *authors* `fba.approved`
(`analysis.conclusion`'s own registry note: "Hard clinical gate. Approval here sets
fba.approved") — its own tier3 fields (04.4, 04.6-04.9) satisfy `authorsTier3` for its
own `TargetDocument` too, since `authorsTier3` checks the whole registry's fields
against `doc.sections`, not "fields belonging to some other document." Under a `no_rp`
pathway, this makes the violation permanently unsatisfiable: the BSA/FBA form would
forever demand the very approval it alone can grant. (Under `interim` it does not fire,
since `interim` is excluded from `requiresFbaApproval`'s OR condition — and
`comprehensive` cannot occur yet at document 04's open time, since `resolvePathway()`
only resolves to `comprehensive` once `fba.approved` is already set.) Reproduced in
`packages/core/test/gates.test.ts`.

**Not resolved here because:** whether to exclude a document from its own gate check
(and how — by document id, by "does this field's approval set the very gate being
checked," or some other rule) is a `@pbs/core` gating-logic decision, not a UI-layer
one. `BsaForm` calls `checkAuthoringGates` anyway (per the existing "wire the banner"
gap item) and displays whatever it returns as non-blocking guidance text (severity is
always `"guidance"` in standalone, per `capabilities.ts`) — the confusing message is
visible, not fixed or hidden. Flagging so Pol can decide whether `authorsTier3` should
exclude fields whose own document is document 04, or whether `requiresFbaApproval`
should only fire for documents *other than* the one authoring the conclusion.

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
