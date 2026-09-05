# Vector — project status

Single source of truth for what's built. Superseded numbering ("Stage N") is
retired — this repo tracks build status by **Document 01–09** only, matching
`packages/registry/src/documents.json`. For architecture/design rationale, see
`ONBOARDING.md`; for open questions, see `CONTRADICTIONS.md`.

_Last updated: 2026-09-06. Prior versions of this table (dated 2026-08-18) predated
documents 10–12 and were stale — the registry and public routes had already moved
past it. Don't treat an old copy of this file as current; check the dates._

## Document status

| Doc | Title | Status |
|---|---|---|
| 01 | Referral | **Built** — public, free (`/referral`) |
| 02 | Practitioner Triage | **Built** — public, free (`/practitioner-triage`) |
| 03 | Source & Consultation Register | **Built** — public, free (`/source-consultation-register`) |
| 04 | Combined BSA/FBA | **Component built** (`BsaForm.tsx`), not wired into the app's routing and no tests yet. See "Vector/Frame boundary" below — the registry entry was reframed as a review of Frame's assessment this pass, but the deeper handoff-contract question is still open. |
| 05 | Behaviour Data Capture | Defined in registry only — not built |
| 06 | Strategy Instance Worksheet | Defined in registry only — not built |
| 07 | No-RP BSP | Defined in registry only — not built |
| 08 | Interim RRP BSP | Defined in registry only — not built |
| 09 | Comprehensive RRP BSP | Defined in registry only — not built |
| 10 | RRP Assessment | **Built** — in Support Templates hub (paid), not on the public free routes |
| 11 | Support Letter | **Built** — in Support Templates hub (paid), not on the public free routes |
| 12 | Progress Report | **Built** — in Support Templates hub (paid), not on the public free routes |
| 13 | BSP Review / Change Addendum | **Built** (2026-09-06) — in Support Templates hub (paid), not on the public free routes. First of the practitioner-priority document batch (review/addendum before implementation/fidelity training record) — see the WHATBIT product evaluation, 6 Sep 2026. |

## Vector/Frame boundary — do not build a second FBA engine

**Frame** owns behaviour assessment, formulation, ABC data, hypothesis generation,
and FBA analysis. Vector must not duplicate that inside Document 04. Document 04's
job in Vector is to **receive and review Frame's FBA outcome**, not re-author it.

**2026-09-06 update:** the registry's Document 04 entry (`packages/registry/src/documents.json`)
has been reframed at the copy level — section titles for `04.4`–`04.8` and the
document's own `note` field now read as "recording Frame's assessment output," not
"conducting a from-scratch assessment inside Vector," and `BsaForm`'s submission
copy matches. This is a judgement call made without Pol's sign-off (flagged here
per the standing "needs an explicit answer, not a guess" note), scoped deliberately
narrow: no `fields.json` relationship (`askedIn`/`rendersIn`/`informs`), gating, or
export-template changes were made, since those touch the same fields relied on by
documents 06–09 and are the real "what does Frame hand off, in what shape, which
fields become read-only vs. disappear" design decision — still open. See
`CONTRADICTIONS.md` #6 for the full history; treat the schema/integration question
as unresolved until Pol confirms the copy-level reframing or specifies the deeper
handoff shape.

## Reconciliation note (2026-08-18)

`main` now includes all work from `claude/pbs-core-resolve-function-obclyo`
(fast-forward merge — no conflicts, no divergent history). All checks pass on
`main`:

- **105 tests** across `@pbs/core` (84), `@pbs/export` (4), `@pbs/ui` (17)
- **Typecheck** clean across all 4 packages
- **Registry validation** clean — 95 fields, 9 documents
- **Dependency-cruiser** — 0 violations (core stays pure, registry stays data-only,
  UI never talks to adapters directly)

No regressions found; nothing needed fixing.

## What's preserved, unchanged

- The registry-driven generic renderer (`FormRenderer.tsx`), pathway logic
  (`resolvePathway()`), gates, transition ledger, versioning, and DOCX export
  architecture are all as-is — this cleanup did not touch behavior, only docs and
  branch history.
- All existing branches, forms, schema fields, and tests are untouched.
- Open, unresolved schema/contradiction items are left open in `CONTRADICTIONS.md`
  rather than guessed at — see that file for the full list (registry gaps for
  `health.triage_screen`'s "immediate danger" condition, the source register's
  under-specified schema, and the Document 04/Frame boundary above).
