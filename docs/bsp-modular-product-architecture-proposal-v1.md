# Behaviour Support Tooling — Modular Product Architecture Proposal v1

**Status:** proposed for approval; no product coding or publishing authorised by this document  
**Date:** 9 August 2026  
**Product position:** standalone tools, a complete PBS workflow, or a provider CRM can be purchased on one shared platform without duplicating the clinical record.

## 1. Recommendation

Build a modular practice platform, beginning with the existing calculator and the specialist behaviour support workflow. Do not begin by building a full generic CRM.

The product should support five commercial entry points:

1. a standalone calculator;
2. selected compatible tools;
3. the complete PBS clinical workflow, connected to an existing CRM where possible;
4. a base CRM with selected tools; and
5. a full CRM containing the complete workflow and operational features.

These are different entitlements over one codebase and one canonical data model. They are not separate products that copy participant records between databases.

## 2. Product layers

### A. Platform foundation — included wherever required

- organisation tenancy;
- user accounts, roles and permissions;
- protected Identity Vault;
- clinical record IDs and source lineage;
- immutable releases, approvals and audit events;
- provider brand profile for exports;
- module entitlements and dependency rules;
- integration credentials and sync receipts;
- deterministic export service; and
- security, retention and deletion controls.

The public calculator may operate without participant identity or a clinical record. Saving it to a participant or using it inside another module activates the relevant protected foundation.

### B. Selectable functional modules

| Module | Can be bought alone? | Hard dependencies |
|---|---:|---|
| Budget and Capacity Calculator | yes | none for temporary/de-identified use |
| Allocation-Adequacy Letter | yes, as calculator add-on | approved calculator result |
| Referral and Practitioner Triage | yes | participant core and audit |
| Assessment and FBA | only as one combined module | participant core, sources and triage/pathway |
| BSP Authoring and Export | no isolated plan writer | approved Assessment/FBA; Strategy Instance layer; pathway gates |
| Session and Implementation Loop | yes with imported plan, or as workflow component | participant core; approved plan/strategy records or controlled import |
| Data, Progress and Review | yes with valid source inputs | session/data records and source lineage |
| RRP Governance | workflow add-on where applicable | participant core, pathway engine and applicable plan workflow |
| CRM Essentials | yes | platform foundation |
| CRM Operations | only on CRM Essentials | scheduling, billing/claims, staff/caseload and operational configuration |

The sales interface may allow customers to select tools, but it must automatically show and include required dependencies. It must never sell a clinically unsafe combination such as a standalone BSP generator without the Assessment/FBA and approval gates.

## 3. Commercial packages

### 1. Calculator

The current budget and pacing engine remains the simplest entry product. It can be used without names or clinical notes. It proves value and can later be connected to a participant record without changing its calculation engine.

### 2. Choose Your Tools

An organisation selects compatible modules. The platform displays:

- included foundation capability;
- required dependencies;
- data that will be stored;
- supported imports, exports and integrations; and
- the upgrade path to the full workflow or CRM.

### 3. Full PBS Workflow

Includes:

- referral and triage;
- source register;
- combined Assessment/FBA;
- pathway and RRP gates;
- Strategy Entries and protected Strategy Instances;
- no-RP, Interim and Comprehensive outputs;
- session and implementation loop;
- participant snapshot, strategy resources and training outputs;
- progress reports, plan review and recommendation letters; and
- calculator/budget meter throughout the participant lifecycle.

This package is deliberately usable beside Splose, ShiftCare, Lumary or another CRM. It owns the specialist clinical workflow while the existing CRM may continue to own appointments, invoicing and general administration.

### 4. Base CRM

Includes:

- participants and contacts;
- referrers, guardians/nominees and stakeholders;
- referrals and intake status;
- tasks, reminders and document register;
- practitioner allocation and basic caseload view;
- appointments or calendar references;
- approved notes and final-document storage; and
- selected clinical tools purchased by the provider.

It does not initially attempt payroll, complex rostering, claiming or every accounting function.

### 5. Full CRM

Adds the complete PBS workflow and, only after the clinical product is proven:

- service agreements and plan/funding management;
- scheduling and resource allocation;
- billing, invoicing and claiming workflows;
- staff, supervision, competency and compliance;
- organisation-wide caseload, deadline and quality dashboards;
- operational reporting; and
- mature integration and migration tooling.

## 4. Architecture

Use a modular monolith for the first product, not independent microservices.

Each module registers:

- `module_id` and version;
- routes and screens;
- roles and permissions;
- required modules;
- records it may read or write;
- approval and release gates;
- exports and integrations;
- subscription entitlement; and
- activation/deactivation rules.

All modules use stable internal domain APIs. The calculator remains one engine whether it is opened publicly, purchased alone, embedded in the PBS workflow or displayed in the future CRM.

The canonical participant record is not owned by a screen or package. In an integration deployment, external CRM IDs map to internal stable IDs. In a full-CRM deployment, the same internal APIs are used without the external adapter.

## 5. Integration model

Support three levels:

1. **API sync** where the external CRM exposes suitable endpoints and permissions;
2. **controlled CSV/file exchange** where API coverage is incomplete; and
3. **approved document push/pull** as the minimum safe fallback.

Every sync stores direction, source and target IDs, field mapping version, time, result, conflicts and receipt. External values never overwrite an approved clinical record silently.

Initial integrations should be narrow:

- pull participant identity and basic plan/appointment metadata into the protected boundary;
- push approved notes or final documents where supported; and
- avoid attempting two-way sync for every record type in the first release.

## 6. Next coding order after the current approval gate

### Stage 1 — implementation contracts

1. Freeze the document templates and fixed section order.
2. Approve the three sample Strategy Entries and Strategy Instance/resource fields.
3. Convert the approved schema, pathway states, approval gates and AI boundary into typed contracts and database migrations.
4. Define the module registry, dependency graph and entitlement model before adding more screens.

### Stage 2 — shared platform shell

5. Build organisation tenancy, authentication, roles and permissions.
6. Build the Identity Vault, clinical participant key and access boundary.
7. Build source lineage, approvals, audit events and immutable releases.
8. Build provider brand-profile configuration for exports; product branding remains in the application only.

### Stage 3 — make the calculator Module 1

9. Place the existing calculator engine behind a stable internal API.
10. Preserve temporary/de-identified standalone use.
11. Add optional organisation saving and participant linking through the protected foundation.
12. Register the calculator in the module/entitlement system and prove that it works standalone and inside a participant workflow.

### Stage 4 — first clinical vertical slice

13. Referral and practitioner triage.
14. Pathway state machine and RRP classification-review gate.
15. Source register and combined Assessment/FBA workspace.
16. Practitioner approval of the FBA conclusion.
17. Strategy Entry selection and protected Strategy Instance authoring.
18. Fixed-order no-RP BSP export with provider branding and an optional inline strategy resource.

This is the first end-to-end proof: collect once, approve once, assemble a valid output.

### Stage 5 — complete the PBS workflow

19. Interim and Comprehensive RRP paths and carry-forward reconciliation.
20. Session preparation, live capture, close and next-session carry-forward.
21. Snapshot, safety, strategy-card and training outputs.
22. Progress report, review and recommendation-letter assembly.
23. Connect the calculator budget meter to planned and completed work.

### Stage 6 — integrations, then CRM

24. Generic CSV and document exchange.
25. One narrow real-world CRM integration selected from an actual pilot customer.
26. Base CRM only after the workflow succeeds beside existing CRMs.
27. Full CRM operational modules only after demand is demonstrated.

## 7. Market position

The initial advantage is not another general-purpose CRM. It is a governed PBS workflow that existing systems do not supply, available without forced migration.

This provides:

- a low-friction entry through the calculator;
- modular purchasing for small providers;
- a full specialist workflow for providers retaining their existing CRM;
- a credible migration path for providers who later want one system; and
- one data model, so upgrading does not require rebuilding participant records.

The principal product risk is excessive package complexity. The customer may choose modules, but the platform must constrain invalid combinations and present a small number of recommended packages.

## 8. Current-market implementation evidence

- Splose publishes a REST API and endpoints for cases, patients and custom fields, making a scoped connector technically plausible: https://docs.splose.com/introduction
- ShiftCare publishes API-key, integration and CSV import pathways, supporting an adapter/fallback strategy: https://help.shiftcare.com/en/collections/13819697-integrations-and-compliance
- Lumary positions itself as a broad Salesforce-based platform spanning client management, workforce, billing, compliance and reporting. Competing with that entire scope at first would dilute the specialist workflow wedge: https://lumary.com/ndis-software/

