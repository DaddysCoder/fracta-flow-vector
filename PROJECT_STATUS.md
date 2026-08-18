# Vector — project status

Single source of truth for what's built. Superseded numbering ("Stage N") is
retired — this repo tracks build status by **Document 01–09** only, matching
`packages/registry/src/documents.json`. For architecture/design rationale, see
`ONBOARDING.md`; for open questions, see `CONTRADICTIONS.md`.

_Last updated: 2026-08-18._

## Document status

| Doc | Title | Status |
|---|---|---|
| 01 | Referral | **Built** — reference implementation, signed off |
| 02 | Practitioner Triage | **Built** — standalone-mode fixed (was hardcoded connected) |
| 03 | Source & Consultation Register | **Built** — standalone-mode fixed (was hardcoded connected) |
| 04 | Combined BSA/FBA | Defined in registry only — **not built**. See "Vector/Frame boundary" below before building this one. |
| 05 | Behaviour Data Capture | Defined in registry only — not built |
| 06 | Strategy Instance Worksheet | Defined in registry only — not built |
| 07 | No-RP BSP | Defined in registry only — not built |
| 08 | Interim RRP BSP | Defined in registry only — not built |
| 09 | (final BSP variant) | Defined in registry only — not built |

## Vector/Frame boundary — do not build a second FBA engine

**Frame** owns behaviour assessment, formulation, ABC data, hypothesis generation,
and FBA analysis. Vector must not duplicate that inside Document 04. Document 04's
job in Vector is to **receive and review Frame's FBA outcome**, not re-author it.

The registry's current Document 04 entry (`packages/registry/src/documents.json`,
sections `04.4`–`04.9`) still reads as a full from-scratch behaviour-assessment
workflow, which conflicts with this boundary. Nothing has been built against it yet,
so there is no code to unwind — but do not build Document 04 as currently specified
without first resolving how it should model "review of Frame's handoff" instead.
See `CONTRADICTIONS.md` #6 for the full note; it is intentionally left open pending
an explicit decision on the Vector/Frame handoff contract.

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
