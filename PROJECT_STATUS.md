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
| 02 | Practitioner Triage | **Built** — standalone-mode fixed (was hardcoded connected). All four `triage.outcome` options present |
| 03 | Source & Consultation Register | **Built** — standalone-mode fixed. Register schema still one free-text field (`CONTRADICTIONS.md` #4) |
| 04 | Assessment / FBA Record | **Built** — receives Frame's `FbaOutcomeBundle`, reconciles it, approves `fba.approved` (`CONTRADICTIONS.md` #6, #8) |
| 05 | Behaviour Data Capture | **Built** — standalone fallback log only; structurally cannot feed document 04 |
| 06 | Strategy Instance Worksheet | **Built** — `fba.approved` gate wired; Strategy Library id + version pinned per instance |
| 07 | No-RP BSP | **Built** — assembly document; zero RRP content, enforced structurally and tested |
| 08 | Interim RRP BSP | **Built** — temporary safeguards, always `unassessed`, each with a no-default disposition |
| 09 | Comprehensive RRP BSP | **Built** — release re-checks gates and blocks while any safeguard is undisposed |

All nine open and complete under `CAPABILITIES.standalone` first (MD-005/MD-006,
`CONTRADICTIONS.md` #5). Connected-mode cross-document prefill remains a later,
uniform deployment-mode switch — no form hardcodes a capability set.

## Vector/Frame boundary — resolved, and implemented

**Frame** owns behaviour assessment, formulation, ABC data, hypothesis generation and
FBA analysis. **Vector** owns the formal PBS workflow and documents. Document 04 is
Vector's point of contact with Frame's output: it receives an `FbaOutcomeBundle`, shows
each finding beside what Vector already holds, and applies one only on an explicit
practitioner action. It never re-runs the analysis.

Reconciliation is confined to sections `04.4`–`04.8`. A finding addressed anywhere else
— triage, the source register, a plan document, or the practitioner's own conclusion at
`04.9` — is refused and displayed as out of scope. See `CONTRADICTIONS.md` #6 for the
full decision and exactly what changed in the registry (retitles plus two tier-0
provenance fields; no clinical field added, removed or re-tiered).

**The contract package is not available.** `@fracta/contract` is unpublished (npm 404,
absent from `pnpm-lock.yaml`), so document 04 is built against a clearly-labelled local
stub, `packages/ui/src/frameContractStub.ts`, and a bundle is loaded by pasting JSON —
no network call, no fabricated integration. See `CONTRADICTIONS.md` #8.

## Gates, provenance and releases

- `fba.approved` is set by approving `analysis.conclusion` at 04.9 (`approve()` on the
  document version) and unlocks 06/07/09 — read from `pathways.json`, never hardcoded.
- Gates always run; `CAPABILITIES.standalone` downgrades severity to guidance and the
  UI says so. A document is never gated on a gate it sets itself (registry `setBy`).
- Documents 07 and 09 author almost no fields of their own, so `GateContext` gained an
  optional `documentGates` list (derived by the caller from the registry) — otherwise
  the field-schema-derived checks found nothing to gate on an assembly document.
- Every interim safeguard carries `unassessed: true` and no default disposition;
  `checkReleaseGates` blocks document 09's release until all four-way dispositions are
  recorded.
- Releases use `versions.ts`: released versions are immutable, corrections create a
  successor draft carrying approvals and lineage.
- **The transition ledger is still not written by any form** — documents 01-03 never did
  either. Flagged, not silently changed: see `CONTRADICTIONS.md` #10.

## Checks (2026-08-18, after documents 04–09)

- **189 tests** — `@pbs/core` 93, `@pbs/export` 23, `@pbs/ui` 73 (was 105 total)
- **Typecheck** clean across all 4 packages
- **Registry validation** clean — 99 fields (was 95), 9 documents
- **Dependency-cruiser** — 0 violations (82 modules, 279 dependencies)
- **No lint tooling is configured in this repo** — there is no `lint` script in any
  `package.json` and no ESLint/Biome config. Dependency-cruiser plus `tsc` are the
  static checks that exist. Not added here: picking and configuring a linter across four
  packages is its own change, and would have produced a diff unrelated to documents 04-09.

Notable tests added: no RRP content can reach document 07 (asserted over asked *and*
quoted fields, groups, id namespaces and pathway lists); document 05's rows never become
a document 04 value in either capability mode, only evidence; Strategy Library pins
survive a library version change; blank and completed DOCX for all nine documents.

## Manual click-through (browser, all three pathways)

Driven through the real dev server. `no_rp`: 01-07 reachable, 08/09 shown forbidden.
`possible_unclear`: 01-05 reachable, 06/07 blocked pending classification review, 08
forbidden. `confirmed`: 06/08/09 reachable, 07 forbidden; pathway resolves to
`comprehensive` only after `fba.approved`. Bundle reconciliation, approval, safeguard
disposition, release and correction were all exercised end to end with no console errors.

Two defects were found this way and fixed: navigating away from a document unmounted it
and discarded unsaved rows, and a saved document could not be reopened for the rest of
the session (which made disposing a safeguard after saving document 08 impossible).

## Open blockers — product decisions, not implementation

1. **`@fracta/contract` unpublished** (#8) — needs the package plus its real finding
   vocabulary.
2. **"Immediate danger" field** (#3) — a clinical threshold, not a clerical fact; needs
   id, tier, author and what else it triggers.
3. **Source register schema** (#4) — needs the concrete field list, and a decision on
   whether Consultation and Source register are one record type or two.
4. **WHATBIT branding** (#9) — no such brand exists in this repo; exports use
   `FRACTA_FLOW_BRAND`.
5. **Triage outcome branch follow-ups** — the four `triage.outcome` options all exist
   and render, but per-branch required follow-up fields (notably a
   practitioner-authored decline reason, never algorithmic) would be new registry
   fields nobody has specified.

## What's preserved, unchanged

No existing test, form, field or behaviour was deleted or weakened. Documents 01-03 are
untouched apart from the shell that now routes to them. All registry changes are
additive (two Document 04 provenance fields, two Document 06 pinning fields) plus
Document 04 section retitles; `@pbs/core`'s only signature change is one optional
`GateContext` member, and `@pbs/export`'s wrappers gained optional trailing arguments.
