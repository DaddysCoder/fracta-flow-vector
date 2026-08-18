# Contradictions log

Per the standing build rule: never silently resolve a contradiction between docs —
log it here and surface it, rather than picking a side.

## 1. Two incompatible "Stage N" numbering schemes (partially resolved — see below)

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

**Partial resolution (2026-08-18 cleanup pass):** going forward, this repo's own
build tracking (`PROJECT_STATUS.md`, `ONBOARDING.md`) uses **Document 01–09** only —
the per-document stage numbers ("Stage 8," "Stage 9," etc.) are retired from active
use and kept only as historical narrative in old handover text, not as a numbering
to build against. `docs/bsp-modular-product-architecture-proposal-v1.md`'s own
Stage 1–6 product-level roadmap is left untouched — it is supplied external planning
material, not something this cleanup rewrites — and still uses "Stage" for a
different, coarser thing than "Document." Anyone reading both should treat the
roadmap doc's stages as separate, non-binding narrative relative to the Document
01–09 build-status numbering used everywhere else in this repo now. Mapping one onto
the other, if ever wanted, remains an open architecture call, not decided here.

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

## 3. `health.triage_screen`'s own note names a condition with no field behind it (RESOLVED — stale, closed 2026-08-18)

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

**Re-examined 2026-08-18 while building documents 04-09, and (at that point) deliberately
left open.** The build brief asked for this gap to be closed "with a clearly factual
field (not a clinical judgement call)". It is not one. "Immediate danger" decides
whether a health and safeguarding screen is *required* of the practitioner, which makes
it a clinical threshold, not a clerical fact — who may set it (referrer? triaging
practitioner?), against what definition, and whether setting it also changes urgency or
the pathway are all unanswered, and `risk.matrix_rating` (the only existing risk figure)
is explicitly forbidden from gating anything (MD-019). A boolean invented here would be
a clinical trigger with no definition behind it. Nothing in documents 04-09 depends on
it, so the rest of the build was not held up.

**Actually resolved earlier, 2026-08-17 (Pol), before this entry was written:**
"RESOLVED — immediate-danger flag: distributed across existing questions, no new
field." The ground-truth review that found this (2026-08-18) confirms
`packages/ui/src/triage.ts` already implements only the RRP-identified half of
`health.triage_screen`'s note — which is exactly what that decision calls for, not a
gap. No code change was needed; the implementation already matched the decision that
predated this entry. Closing as stale rather than as still-blocking. The registry
field's own `note` text ("Shown only when RRP is identified or immediate danger is
flagged") still names a condition with no field behind it — that wording is now known
to be intentional (no new field, by decision) and worth rewording for clarity in a
future documentation pass, but it is not a blocker.

## 4. Source register/Consultation narrative spec is far richer than the one field the registry actually defines (STILL OPEN — blocker, needs a concrete field list)

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

**Re-examined 2026-08-18 while building documents 04-09. No sub-fields were added, and
here is the reasoning, since the brief explicitly left the call open.** The brief allowed
"a small number of clearly mechanical/factual sub-fields (e.g. source type, date, author
role)" to be added without a product decision. On inspection that is not actually the
low-risk option:

- Choosing which 3 of the doc pack's ~19 attributes become columns *is* the product
  decision — it fixes what every row must carry, and the ones left out (reliability,
  currency, consent/authority, confirmation status) are exactly the ones that carry
  governance weight downstream.
- The pack describes **two different record types** (Consultation and Source register)
  sharing one registry field today. Structuring one of them without deciding whether they
  split into two documents/groups would bake the ambiguity into the schema.
- Half-structuring means a migration later: existing free-text rows would have to be
  re-keyed into columns by hand, per participant, in a clinical record.

`source.entry` is therefore unchanged and document 03 still works exactly as before.
**Blocked pending: the concrete field list — ids, labels, tiers, types, transitions,
staleness, and whether Consultation and Source register are one record type or two.**
Recommendation, for whoever makes that call: split them first, then specify the ~19
attributes against the split, rather than adding columns to the current single field.

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
`ReadOnlyField` renders "Not yet available" for all of them until connected mode is
turned on later. This was already `ReadOnlyField`'s designed fallback for a missing
quoted value (see its own doc comment), not new behaviour needed for this fix — it was
verified, not built, as part of this reversal.

## 6. Document 04's registry entry duplicated Frame's job description (RESOLVED — 2026-08-18)

**Found:** 2026-08-18, during the reconcile/cleanup pass.

`packages/registry/src/documents.json` document `04` is titled "Combined BSA/FBA"
with sections `04.4` "Behaviour objects," `04.5` "Observation scaffold," `04.6`
"Evidence reconciliation," `04.7` "Pattern analysis," `04.8` "Competing hypotheses
and formulation," `04.9` "Practitioner conclusion" — i.e. a full functional
behaviour assessment/analysis workflow authored inside Vector.

Per current product direction, **Frame** (a separate system) owns behaviour
assessment, formulation, ABC data, hypothesis generation and FBA analysis.
Vector's document 04 is meant to receive and review Frame's FBA outcome, not
re-implement that analysis. As registered today, document 04's section list reads
like a second, duplicate FBA engine built inside Vector, which directly conflicts
with that boundary.

**Resolution (Pol, 2026-08-18 — explicit product decision, then implemented):**
Document 04 becomes the **Assessment / FBA Record**: it receives Frame's
`FbaOutcomeBundle`, displays its findings, lets the practitioner reconcile them into
the record, and carries the approval that sets `fba.approved` for documents 06/07/09.
Vector does not author FBA analysis.

What was actually changed, and why each choice was made rather than guessed:

- **`documents.json` — retitled, nothing removed.** Document 04 is now "Assessment /
  FBA Record"; `04.3` is "Sources, methods and assessment handoff"; `04.4`, `04.5`,
  `04.7` and `04.8` are marked "(received — reconcile)". No section was deleted and no
  field was deleted, moved or re-tiered — documents 07/08/09 quote `behaviour.*` and
  `analysis.*` through `rendersIn`, so removing them would have broken every plan
  document. The sections change role, not existence.
- **Two new tier-0 fields, both pure provenance:** `fba.bundle_id` and
  `fba.bundle_received_at` (both askedIn `04.3`, `rendersIn: []`). They record *which*
  assessment output an approved conclusion reviewed. Tier 0 because they are identity
  facts, not interpretation; `rendersIn` deliberately empty because whether a plan
  document should print the bundle reference is a separate decision nobody has made.
- **No new clinical field was invented.** The "reconciliation" behaviour lives in the
  UI, not the schema: `packages/ui/src/frameContractStub.ts` compares each bundle
  finding against what Vector currently holds and reports `offered` /
  `accepted_unchanged` / `differs` / `out_of_scope`; `acceptFinding` copies a finding
  into the record only on an explicit click. Reconciliation is confined to `04.4`-`04.8`
  (`FRAME_RECONCILED_SECTION_IDS`): a finding addressed anywhere else — triage, the
  source register, a plan, or the practitioner's own conclusion at `04.9` — is refused
  and shown as `out_of_scope`, so Frame can never write into Vector's judgement.
- **`04.9` stays practitioner-authored and is the gate.** Approving it calls `approve()`
  on the document version and sets `fba.approved`, which `pathways.json` says unlocks
  06/07/09. Approval is refused while `analysis.function`,
  `analysis.maintaining_variables` or `analysis.conclusion` is empty.

Still open, and NOT decided here: whether the `04.4`-`04.8` fields should eventually
become registry-level read-only (a `readOnly`/`receivedFrom` flag on `FieldDef`) rather
than practitioner-editable fields displayed beside Frame's proposal. They were left
editable on purpose — a reconciliation the practitioner cannot correct is worse than no
reconciliation, and Vector must still work standalone with no bundle at all.

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

## 7. Interim-safeguard *disposition* is not a registry field, deliberately (decided 2026-08-18)

**Found:** 2026-08-18, building document 08.

`pathways.json` names four dispositions (`replace | retain_with_new_justification |
revise | retire`), `gates.ts` already models them on `InterimSafeguard`, and a
Comprehensive release blocks while any safeguard has none. The obvious move was to add a
registry select field for it. That was not done, for a structural reason worth recording:

- A safeguard row is authored in the `interim_safeguard` group at `08.9`. The disposition
  is decided later, when the Comprehensive plan (09) reviews it.
- A field `askedIn 09.13` in that same group would split one repeatable group across two
  documents. `FormRenderer` renders a group per section, so document 09 would render its
  own, separate rows — row identity between "the safeguard" and "its disposition" would
  be lost, and the gate keys off row identity.

So disposition is modelled as case governance on the `InterimSafeguard` object
(`safeguardsFromRows` in `packages/ui/src/plan.ts`), recorded in the document 08 UI
alongside each row and carried to 09, where `checkReleaseGates` enforces it. `unassessed`
is likewise **not** a field: it is always true for every row on the Interim BSP by
definition, so offering it as a tick-box would imply a practitioner could turn it off.

**Revisit if:** dispositions ever need to print in an exported plan, or to be resolvable
across separately-stored documents in connected mode. Both would need a real registry
representation and a decision about how row identity survives between documents.

## 8. `@fracta/contract` does not exist yet — document 04 is built against a labelled stub (blocker)

**Found:** 2026-08-18.

Vector and Frame are to exchange `ParticipantContext` and `FbaOutcomeBundle` only through
the shared `@fracta/contract` package. Verified as of 2026-08-18: no reference in any
`package.json` or in `pnpm-lock.yaml`, and `npm view @fracta/contract` returns 404 on the
public registry. Frame's repo was not inspected — the two repos never import each other's
source, so its branch state cannot substitute for a published package.

`packages/ui/src/frameContractStub.ts` therefore declares the shapes Vector expects,
under a header saying exactly what it is and how to replace it. **Nothing in it talks to
Frame**: a bundle is loaded by pasting JSON into document 04, which is also the honest
standalone answer (no network call). No fake live integration was built.

**Blocked pending:** `@fracta/contract` being published/installable, plus its real field
names for `FbaOutcomeBundle.findings` — in particular whether findings address Vector
registry field ids (as the stub assumes) or Frame's own vocabulary, which would need a
mapping layer nobody has specified.

## 9. WHATBIT branding assets do not exist in this repo (blocker)

**Found:** 2026-08-18.

The brief asks for DOCX exports "with WHATBIT branding". `packages/export/src/brand.ts`
defines exactly two brand modes — `fracta_flow_product_brand` (the "Fracta Flow" product
brand, MD-009) and `provider_brand_profile` (a provider's own, supplied at runtime).
There is no WHATBIT name, colour, logo or asset anywhere in the repo or its history, and
inventing a brand identity is not an implementation choice.

All nine documents export blank and completed DOCX under `FRACTA_FLOW_BRAND`, which is
what the code actually supports today. **Blocked pending:** whether WHATBIT is a third
product brand or a `providerBrand()` profile, plus its name string, ink/paper/accent hex
values, and any logo asset.

## 10. Documents 01-09 do not write to the transition ledger (finding, not silently changed)

**Found:** 2026-08-18, verifying point 9 of the build brief.

`packages/core/src/ledger.ts` (append-only, `appendTransition`/`historyFor`) is fully
implemented and tested, but **no form has ever called it** — not documents 01-03 as built
by earlier sessions, and not 04-09. This was checked rather than assumed.

It reads as intentional rather than as a bug: `CAPABILITIES.standalone` sets
`transitionLedger: false`, and every document runs standalone today, so a ledger would be
written and never read. Documents 04-09 therefore do not call it either, rather than
inventing a half-connected behaviour — but they *do* use `versions.ts`
(`createDraftVersion`, `approve`, `release`, `correctDocument`), which is not
capability-gated and works standalone.

**Flagged, not fixed:** wiring `appendTransition` is part of turning connected mode on
uniformly, and doing it now would either bake a connected assumption into forms (exactly
the mistake reversed in #5) or write a ledger nothing reads. Whoever builds connected mode
should wire it once, in the shell, for all nine documents.

## 11. `checkAuthoringGates`' `fba.approved` gate is self-referential on document 04 itself (RESOLVED — fixed one layer up)

**Found:** 2026-08-18, on `main`, while building `BsaForm` (document 04, then titled
"Combined BSA/FBA").

`packages/core/src/gates.ts`'s `checkAuthoringGates` sets `requiresFbaApproval` whenever
a document authors tier3 fields under a `no_rp` or `comprehensive` pathway. Document 04
is the one document that *authors* `fba.approved` (`analysis.conclusion`'s own registry
note: "Hard clinical gate. Approval here sets fba.approved") — its own tier3 fields
satisfy that same check for its own `TargetDocument`, since the check has no concept of
"fields belonging to some other document." Under `no_rp`, this made the violation
permanently unsatisfiable: the form would forever demand the approval it alone can grant.

**Resolution:** fixed independently on this branch, one layer above `@pbs/core` rather
than inside it — `packages/ui/src/documentForm.ts`'s `gatesSetHere(documentId)` reads
`pathways.json`'s `gates[...].setBy` and `authoringGates()` filters out any violation for
a gate the current document itself sets, with the doc comment: "A document is never
gated on a gate it is the one to set." `packages/core/src/gates.ts` itself is unchanged —
calling `checkAuthoringGates` directly (as `packages/core/test/gates.test.ts` still does,
deliberately, to document the raw core behaviour) still returns the violation; the fix is
that nothing in the actual UI calls `checkAuthoringGates` directly anymore — `AssessmentForm`
and every other document form go through `authoringGates()`/`releaseGates()` instead.
No change needed to close this.

## 12. `BsaForm.tsx`/`bsa.ts` (main's "Combined BSA/FBA") preserved as non-canonical (decided 2026-08-18)

**Decision (Pol, 2026-08-18):** Document 04's canonical implementation is
`AssessmentForm.tsx` — the Assessment/FBA Record, receiving and reconciling Frame's
`FbaOutcomeBundle` (see #6 above). `main`'s independent build, `BsaForm.tsx` +
`bsa.ts` (full from-scratch practitioner authoring of the same registry fields, no
Frame handoff), is **not** canonical but is preserved, unmodified except for a status
header comment, as a possible future "Frame unavailable" manual-authoring fallback —
a decision explicitly deferred, not made here.

To avoid exposing two competing Document 04 routes: `BsaForm`/`BsaResult` remain
exported from `packages/ui/src/index.ts` (so the component stays reachable as a library
symbol), but nothing in the live app wires it in — `VectorApp` resolves document "04"
to `AssessmentForm` only, and `ReferralApp.tsx` (itself unused by the live app, which
mounts `VectorApp`) was deliberately **not** updated to wire `BsaForm` into its demo
flow, unlike on `main`, specifically to avoid reintroducing a second navigable "document
04" experience. Both forms read the same registry document/field definitions, which now
reflect the Assessment/FBA Record's titles and sections — `BsaForm`'s own submitted-state
copy ("Combined BSA/FBA submitted") predates that rename and was left as-is, matching
"preserve unmodified."
