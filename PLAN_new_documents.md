# Plan: RRP Assessment, Support Letter, Progress Report

Written before implementation per the handoff's step 3. Not a request for approval —
Pol pre-approved "build all, then check."

## Document IDs
Documents 01–09 are taken (`packages/registry/src/documents.json`); 05–09 are
registry-only BSP-family entries with no UI wired to them yet, and the Support
Templates wizard is a deliberately separate, non-registry system (`support-templates/`).
The three new documents are genuinely net-new, so:

- `10` — RRP Assessment
- `11` — Support Letter
- `12` — Progress Report

## Pathways
- `10` (RRP Assessment): `["interim", "comprehensive"]` only — the prototype's own
  copy says it's "required before an Interim BSP for any participant flagged with a
  possible or confirmed restrictive practice," so a no-RP case has no reason to open
  it.
- `11` (Support Letter) and `12` (Progress Report): `["no_rp", "interim",
  "comprehensive"]` — a funding letter or progress report is needed regardless of
  RRP status.

**Why both letter documents get the same pathway set:** `validate.mjs`'s
`sectionToDoc` is a `Map` keyed by section id — if two `DocumentDef`s each listed a
section with the same id (needed to share sections between 11 and 12), whichever
document is inserted into `documents.json` last would silently win that section's
`docPathways()` lookup for the pathway-compatibility check. Giving both documents
identical pathway sets makes that map collision harmless instead of a latent bug.

## Shared Support Letter / Progress Report sections
Both documents share their first 5 sections verbatim (Participant details, Author
details, Purpose and sources, Background, Functional impact domains). Modelled as
one set of section ids reused in both `DocumentDef.sections` arrays (`SL.1`…`SL.5`),
with the fields that live in them defined **once** in `fields.json`, `askedIn` one of
those shared ids — never duplicated per document. `askedIn` only takes one section
id per field def, so this is the only way to satisfy "one shared field/section group
referenced by both, not duplicated" without changing `FieldDef`'s shape.

Support Letter continues with `SL.6` Behaviours of concern, `SL.7` Restrictive
practices, `SL.8` Supports, `SL.9` Impact if not provided, `SL.10` Funding quote,
`SL.11` Summary and sign-off.

Progress Report continues with `PR.6` Progress since last report, `PR.7` Strategies
trialled, `PR.8` Goal progress, `PR.9` Summary and sign-off.

## RRP Assessment quoted into Support Letter
Support Letter's `SL.7` Restrictive practices section renders (never re-asks) a
subset of RRP Assessment's per-practice-type fields — `what_happens`, `rationale`,
`reduction_plan` for each of the 5 types — via `rendersIn`, the same pattern
`Triage`'s `02.A`/`02.G` already use to quote `Referral`. Standalone mode (this
build) resolves these to "Not yet available" until connected mode exists, exactly
like every other quoted field in the app today.

## RRP Assessment fields
Prefixed `rrpassess.` (not `rrp.`, which is already used by Interim/Comprehensive
BSP's own RRP sections in `fields.json` — a different, existing field family).

- `10.1` Practice types in use: one multiselect,
  `rrpassess.practice_types` (Seclusion / Chemical restraint / Mechanical restraint
  / Physical restraint / Environmental restraint).
- `10.2`–`10.6`, one section per practice type, each with the 7
  `RRP_COMMON_FIELDS` from the prototype (what happens, since, evidence, rationale,
  least-restrictive analysis, reduction plan, duration/review) as
  `rrpassess.<type>.<field>`.
- `10.3` (Chemical restraint) additionally gets `rrpassess.chemical.medication_name`,
  `.dose`, `.side_effects`, `.frequency` (PRN/Routine), `.route` (Oral/Other).

Which of the 5 per-type sections/cards actually render is a UI visibility concern
(driven by `rrpassess.practice_types`), the same pattern `TRIAGE_VISIBILITY_RULES`
already uses — not a registry concern.

Tiers: identity-adjacent facts (dates, medication name/dose) are tier 1; "what
happens"/evidence/side effects are tier 2 observations; rationale/least-restrictive
analysis/reduction plan are tier 3 interpretation (clinical judgement, never
prefilled per the `tier3-never-prefilled` rule — `transition.default: "new"`).

## MD-012 (`no-rp-clean`)
`validate.mjs`'s MD-012 check only fires for `rrp.`/`interim.`-prefixed fields
rendering into document `07`'s sections. None of the three new documents are `07`
and no new field uses those prefixes, so this check is unaffected — confirmed by
running `node packages/registry/src/validate.mjs` after the registry changes below.

## Funding quote math (Support Letter)
`(travel_hours / 2) / participants_seen_this_trip × hourly_rate` — apportioned, not
a flat percentage. Implemented as a pure function in
`packages/ui/src/support-letter/quote.ts`, unit-tested directly rather than only
eyeballed in the UI, since this is exactly the kind of formula that regresses
silently.

## Gating
All three gated behind a **new** dedicated `PaidFeature` per document (`rrp_assessment`,
`support_letter`, `progress_report`) in `entitlements.ts`, rather than reusing
`support_templates` — the README's entitlement table lists them as their own rows,
distinct from the Support Templates hub row, and the prototype's `hubCards`
eyebrow/copy treats them as separate products. Wired through the same
`canUseFeature`/`useVectorCommercial()` mechanism as everywhere else — no new gating
mechanism.

## Digital screens vs. print export
Digital screens (`packages/ui/src/rrp-assessment/`, `support-letter/`,
`progress-report/`) reuse `tokens.css`'s `.card`, `.wizard-eyebrow-row` etc. — the
same design system as every other screen (non-wizard, single-page, card-per-section,
matching the prototype's `isRrpAssessment`/`isSupportLetter`/`isProgressReport`
views).

Print/export output is a **separate** token set, per `Vector Reports Preview
(print).dc.html`: system UI font stack (no Montserrat/Nunito), ink/muted only, no
accent colour except a light-grey `.tag` chip, letterhead layout (org logo
placeholder top-left, doc title top-right), one page. This lives in its own
`packages/ui/src/print/reportPrint.css`, loaded only by these three documents'
print/DOCX-adjacent print view — never mixed into `tokens.css` or the digital
screens' classes.

## What's deliberately out of scope this pass
- Wiring `resolvePathway`/`checkAuthoringGates`/`pathways.json`'s per-classification
  `permits`/`forbids`/`blocks` lists for documents 10–12 (e.g. "RRP Assessment
  required before Interim BSP" as a hard gate). The README's backend note describes
  this as a real future rule but the task at hand is registry + screens + print, not
  new gate wiring across `@pbs/core`. Flagging rather than guessing at gate
  semantics not asked for here.
- Org-level NDIS price-guide default for the hourly rate (explicitly called out in
  the README as "should eventually," not now).
- The `planReviewDate`-driven Progress Report reminder (Arc-integration-dependent,
  no Arc integration exists yet per the README's own screen map).
