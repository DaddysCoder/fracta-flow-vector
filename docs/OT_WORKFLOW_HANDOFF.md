# Vector — Occupational Therapy Workflow & Information-Flow Handoff

Status: workflow/design handoff only. No visual design and no OT implementation in this document.

Date: 6 September 2026

## 1. Product boundary

Vector is a **practitioner document workflow**, not a practice-management system.

This OT expansion must not add organisational caseloads, staff permissions, scheduling, invoicing, team administration, or a central cloud participant database. Those remain Arc concerns.

The OT flow must preserve Vector's privacy-first/local architecture. Cross-document reuse should happen inside the local Vector workflow/session/bundle rather than by introducing a central cloud clinical record.

## 2. Do not invent a second OT architecture

The existing Arc OT work is the source architecture for the discipline. Vector should reuse its clinical sequence and concepts while narrowing them to document workflow.

Relevant Arc alignment:

- OT.01 Referral and intake
- OT.02 Referral triage
- OT.03 Consent and information sharing — treated in Vector as shared consent state, not a separate required core document
- OT.04 Evidence checklist — treated in Vector as the evidence/source register used across assessment
- OT.05 Occupational profile
- OT.06 Functional capacity assessment
- OT.07 Functional activity finding — the reusable unit inside FCA; provenance is required and never defaulted
- OT.08 OT risk and environment — captured within/alongside FCA as relevant
- OT.09 Standardised instrument administration — wrapper only where rights permit
- OT.10 Clinical formulation — practitioner-authored/reviewed reasoning, never auto-carried as unquestioned fact
- OT.11 Goals and intervention plan
- OT.12 OT session note — supporting repeated progress evidence, not a core pathway document
- OT.13 Assistive technology pathway
- OT.14 Seating and mobility
- OT.15 Home modification pathway
- OT.16 NDIS AT and home modification report
- OT.17 Progress and reassessment report
- OT.18 Discharge and transfer summary

Vector's first end-to-end pathway is therefore:

```text
Referral
  ↓
Triage
  ↓
Occupational Profile
  ↓
Functional Capacity Assessment
  ↓
Goals & Intervention Plan
  ↓
Progress / Reassessment
  ↓
Discharge / Transfer
```

Conditional branches from FCA:

```text
FCA
 ├─ practitioner confirms AT pathway
 │    ├─ general AT assessment / trial
 │    └─ practitioner confirms Seating & Mobility sub-branch
 │
 └─ practitioner confirms Home Modification pathway

AT / Seating / Home Mod findings
  ↓
AT / Home Modification Report
```

A branch may be suggested by prior information, but **starting the branch is always a practitioner decision**. A functional limitation must never automatically become an AT prescription or home-modification recommendation.

---

# 3. Core information model

Vector should use one local OT pathway bundle with source-aware values rather than copying free text between forms.

Each reusable value should conceptually retain:

```text
value
source document
source field / finding
source type
created/confirmed date
last reviewed date
status: current | changed-upstream | superseded | unavailable-source
review requirement
```

This is a workflow model, not a new cloud record.

The existing Vector registry/resolve model already distinguishes field tiers, asked-in vs rendered/informs relationships, staleness and transition rules. OT should extend those same ideas rather than introduce a separate OT-only prefill engine.

## Four data classes

### Class A — shared factual data

Examples:
- participant name
- DOB
- contact details
- representative / nominee
- funding identifiers/details
- referrer
- recorded diagnosis text
- living situation
- current provider/support contact details

Behaviour:
- may prefill automatically
- remains editable
- retains source label
- later changes do not silently overwrite practitioner-authored downstream work

### Class B — source-attributed evidence

Examples:
- participant report
- family/carer report
- practitioner observation
- external report finding
- standardised instrument result
- trial result
- environmental observation

Behaviour:
- may carry forward only with provenance
- carries source + date + author/informant where available
- can inform later reasoning but is never silently converted into a conclusion

### Class C — clinical interpretation

Examples:
- functional interpretation
- formulation
- relationship between impairment, environment and participation
- professional judgement about support needs

Behaviour:
- can be displayed downstream as prior clinical reasoning
- **never auto-accepted as current**
- requires practitioner review/confirmation before reuse in a new final document
- upstream factual change flags this content for review; does not overwrite it

### Class D — recommendations / decisions

Examples:
- intervention recommendation
- AT prescription
- support level recommendation
- home modification recommendation
- accept/waitlist/decline/redirect decision

Behaviour:
- never inferred from raw findings
- must be entered by a practitioner or explicitly approved by them
- may appear later as a previous recommendation, clearly labelled as such
- cannot silently become a current recommendation

---

# 4. Provenance behaviour

Every reused item shown to the practitioner should expose a simple source label, for example:

- FROM REFERRAL
- FROM OT PROFILE
- FROM FCA — PARTICIPANT REPORT
- FROM FCA — PRACTITIONER OBSERVATION
- FROM EXTERNAL REPORT
- FROM STANDARDISED TOOL RESULT
- FROM AT TRIAL
- FROM PREVIOUS REVIEW

For FCA findings, provenance is mandatory. A finding cannot be treated as complete until the practitioner has selected a source/provenance type.

Minimum provenance options:

- participant report
- family/carer/support-person report
- practitioner observation
- record review
- external report
- standardised instrument result
- trial
- environmental observation

Where relevant also capture source date and source name/attachment/reference.

Do not default provenance based on which screen the practitioner is on.

---

# 5. End-to-end document dependency map

```text
Referral
 ├─→ Triage
 ├─→ Occupational Profile
 ├─→ FCA
 ├─→ Goals & Intervention Plan
 ├─→ AT / HM branches
 └─→ Discharge / Transfer

Triage
 ├─→ Occupational Profile (scope/pathway context)
 ├─→ FCA (scope, urgency/risk, likely assessment path)
 └─→ branch availability cues only

Occupational Profile
 ├─→ FCA (priorities, roles, routines, environments, barriers, strengths)
 ├─→ Goals & Intervention Plan
 ├─→ AT / HM branches
 ├─→ Progress / Reassessment
 └─→ Discharge / Transfer

Evidence / Source Register
 ├─→ FCA
 ├─→ AT / HM branches
 ├─→ Progress / Reassessment
 └─→ reports

FCA
 ├─→ Goals & Intervention Plan
 ├─→ AT pathway
 ├─→ Seating & Mobility
 ├─→ Home Modifications
 ├─→ AT / HM Report
 ├─→ Progress / Reassessment baseline
 └─→ Discharge / Transfer

Goals & Intervention Plan
 ├─→ Progress / Reassessment
 └─→ Discharge / Transfer

AT / Seating / HM pathway
 ├─→ AT / HM Report
 ├─→ Progress / Reassessment
 └─→ Discharge / Transfer

Progress / Reassessment
 ├─→ later Progress / Reassessment
 ├─→ revised plan/recommendations after practitioner review
 └─→ Discharge / Transfer
```

---

# 6. Stage field groups and carry-forward rules

## FLOW 1 — Referral

Purpose: create the local root record for the OT pathway.

### First collected here

**Participant details**
- participant name
- preferred name
- DOB
- NDIS/funding identifier where relevant
- contact details
- address / location where relevant

**Representative / nominee**
- name
- relationship/role
- contact details
- decision-making/communication role as recorded

**Referral details**
- referrer name
- organisation/service
- contact details
- referral date
- reason for referral
- requested OT service
- urgency requested by referrer

**Funding / service details**
- funding source
- plan/service dates if relevant
- plan management / invoicing information only where needed for the document workflow; do not create billing functions

**Current context**
- current supports
- known diagnoses or conditions as supplied
- known risks
- communication/access requirements
- language/interpreter requirements
- known sensory/access needs

**Evidence / consent**
- existing reports/evidence available
- consent status
- consent scope / information-sharing limitations

### Prefill downstream

Automatically prefill Class A shared facts into later documents.

Carry referral reason, requested service, current supports, known risks, communication/access requirements and existing evidence as source-attributed referral information.

### Never infer

- clinical urgency
- diagnosis not supplied in source material
- scope of OT service
- suitability for OT
- assessment pathway
- recommendations

### Feeds

Triage, Occupational Profile, FCA, all branches, reports, discharge/transfer.

---

## FLOW 2 — OT Triage

Purpose: decide whether/how the OT referral proceeds without performing the assessment.

### Reads from Referral

- participant identity
- referral reason
- requested service
- referrer details
- referrer-stated urgency
- known risks
- communication/access requirements
- current supports
- available evidence
- consent status

### Practitioner adds

- referral appropriateness
- OT service scope
- clinical urgency
- immediate risk / immediate action required
- likely assessment pathway
- evidence required
- home/environment assessment required: yes/no/uncertain
- AT assessment likely: yes/no/uncertain
- specialist assessment required: yes/no/uncertain
- outcome: accept / waitlist / decline / redirect
- reason for outcome
- next action

### Review gate

Triage cannot be considered complete until practitioner explicitly confirms:

1. outcome;
2. service scope or reason for redirect/decline;
3. immediate-risk action if a risk is recorded;
4. consent is sufficient for the next step or a consent gap is acknowledged.

### Never infer

- outcome
- clinical urgency from referrer urgency alone
- AT prescription
- home-modification need
- FCA conclusion

### Feeds

Occupational Profile and FCA as pathway/scope context. AT/HM fields are **cues to consider a branch**, not branch decisions.

---

## FLOW 3 — Occupational Profile

Purpose: collect the participant's occupational context once and make it reusable.

### Reads

- participant identity
- referral reason
- requested service
- communication/access requirements
- current supports
- living situation if already known

### Practitioner collects

**Participant voice and priorities**
- participant priorities
- participant-described goals
- what matters to the participant
- preferred communication/decision involvement

**Occupational context**
- roles
- routines
- interests
- meaningful activities
- current environments
- living situation
- support network

**Functional participation overview**
- self-care
- domestic activities
- community participation
- education/employment
- sleep/rest where relevant
- sensory/environmental considerations
- current equipment
- barriers
- strengths

### Provenance

Each substantive statement should be attributable where needed, especially where participant, family and practitioner perspectives differ.

### Carry forward

- participant priorities → FCA context + intervention plan
- roles/routines/activities → FCA functional interpretation context
- environment/living situation → FCA + home-mod pathway
- current equipment → FCA + AT branch
- barriers/strengths → FCA + goals/intervention
- participant-described goals → plan as **proposed participant goals**, not automatically final OT goals

### Never infer

- formal functional limitation
- level of assistance required
- clinical formulation
- agreed OT goal
- recommendation

---

## FLOW 4 — Functional Capacity Assessment

Purpose: main assessment workspace. Findings accumulate across visits, sources and informants.

### Reads

- Referral
- Triage
- Occupational Profile
- evidence/source register
- previous relevant findings/reviews

### FCA domain groups

Use domain groups that are broad enough for OT practice and align to Arc's FCA concept:

1. communication
2. learning / cognition
3. mobility and transfers
4. self-care / ADL
5. self-management
6. social / community participation
7. domestic life / IADL
8. education / employment
9. environmental access / home context
10. support requirements

Risk/environment can be surfaced across domains rather than isolated from function.

### Reusable unit: Functional Activity Finding

Each finding should contain:

- domain
- activity/task
- finding type: observed fact / reported information / clinical interpretation / recommendation
- finding text/value
- provenance type
- source person/document/tool
- source/reference/attachment if applicable
- date
- environment/context
- assistance/support/equipment observed or reported
- confidence/limitations where relevant
- practitioner notes

The practitioner must be able to visually distinguish:

```text
OBSERVED FACT
REPORTED INFORMATION
CLINICAL INTERPRETATION
RECOMMENDATION
```

Do not convert one type into another automatically.

### Standardised assessment wrapper

Do not reproduce proprietary questions unless rights explicitly permit it.

Store only:

- instrument name
- version
- date
- administrator
- licence/permission state
- supported state: embedded / result only / attachment only / external administration / blocked
- score/result
- interpretation entered by practitioner
- attachment
- source/reference

### FCA practitioner-review gate

Before a final FCA/report can be produced, require practitioner review of:

- domain coverage / intentionally not assessed domains
- provenance on findings
- unresolved contradictions between sources where material
- clinical interpretation
- recommendations
- any branch decision (AT / Seating & Mobility / Home Mod)

### Never infer

- clinical formulation from raw findings
- support level recommendation
- AT need/prescription
- home-modification recommendation
- causal explanation

### Feeds

Goals & Intervention Plan, AT/HM branches, AT/HM report, progress baseline, discharge/transfer.

---

## FLOW 5 — Goals & Intervention Plan

Purpose: convert reviewed evidence and participant priorities into an agreed plan.

### Reads

- participant priorities from Occupational Profile
- participant-described goals
- confirmed FCA findings
- confirmed functional barriers
- relevant strengths
- environmental issues
- previous recommendations, labelled as previous

### Practitioner adds / approves

For each goal:
- agreed OT goal
- link to participant priority
- baseline/current state
- intervention/action
- responsible person
- frequency/intensity where relevant
- outcome measure
- review date
- equipment/trial actions where relevant
- implementation notes

### Critical distinction

`participant-described goal` may prefill as source material.

`agreed OT goal` requires practitioner confirmation.

`intervention` and `recommendation` require practitioner entry/approval.

### Review gate

Require explicit approval of goals, interventions and measures before the plan is final/exportable.

### Feeds

Progress/Reassessment and Discharge/Transfer.

---

## FLOW 6 — Progress / Reassessment

Purpose: compare current function against baseline without rewriting the original FCA.

### Reads

- FCA baseline findings
- active goals
- interventions/actions
- previous recommendations
- previous progress reports
- AT/HM trials/recommendations where relevant

### Collects

- services actually delivered
- participant engagement
- progress against each goal
- current functional state
- outcome evidence
- interventions trialled
- what worked
- what did not
- changes in environment/support
- new risks
- new evidence
- revised recommendations
- ongoing support needs

### Comparison behaviour

The default review view should be:

```text
BASELINE → CURRENT
```

For each goal/domain, show the prior confirmed baseline and a separate current-state entry. Never overwrite the baseline.

### Recommendation handling

Previous recommendations appear as historical recommendations.

A revised recommendation must be practitioner-entered/approved.

### Feeds

Future reassessment, updated plan after review, and discharge/transfer.

---

## FLOW 7 — Discharge / Transfer

Purpose: produce a concise handover, not a dump of the entire pathway.

### Reads

- original referral purpose
- current/agreed intervention plan
- current goals
- latest progress/reassessment
- outstanding recommendations
- current equipment
- current risks relevant to handover

### Practitioner collects / confirms

- reason for discharge/transfer
- outcomes achieved
- goals achieved/partly achieved/not achieved
- unresolved needs
- current supports
- current equipment
- risks requiring handover
- recommendations for next service/person
- person/service receiving handover
- follow-up required
- consent/information-sharing check for handover

### Review gate

Before final export require explicit confirmation of:

- recipient/handover destination where relevant
- unresolved risks
- current recommendations
- consent scope

---

# 7. Conditional branch logic

## Assistive Technology branch

### Branch may be surfaced when

Any of the following exists:
- triage says AT assessment is likely/uncertain;
- FCA finding records current equipment problem/need;
- functional activity finding identifies a task barrier where equipment may be relevant;
- practitioner manually starts AT pathway.

### But branch starts only when

Practitioner selects **Start AT assessment/trial**.

Do not auto-start based on score, diagnosis, mobility limitation or keyword.

### Carries forward

- participant identity
- relevant goals
- relevant functional limitations/findings
- environment/context
- current/previous equipment
- relevant risks
- relevant FCA evidence

### Practitioner records

- identified AT need
- options considered
- equipment trialled
- trial date and conditions
- observed outcome
- participant feedback
- support-person feedback
- risks
- suitability
- training requirements
- implementation requirements
- recommendation
- rationale

### Report readiness gate

A final AT recommendation requires explicit practitioner approval. Where a trial is expected but not completed, the report should flag that state rather than fabricate a conclusion.

---

## Seating & Mobility branch

Specialised sub-branch of AT.

### Entry

Only practitioner-confirmed. It may be surfaced by mobility/transfer/posture findings but not automatically opened.

### Carries forward

- mobility findings
- transfer findings
- relevant functional limitations
- current equipment
- environment
- relevant risks
- participant goals

### Collects

- mobility presentation
- transfers
- posture
- positioning needs
- pressure considerations
- current equipment
- relevant environment
- professional measurements where appropriate
- trial equipment
- trial findings
- risks
- support requirements
- recommendation

Do not embed proprietary assessment instruments.

---

## Home Modification branch

### Branch may be surfaced when

- triage flags home/environment assessment likely;
- FCA identifies an environmental access barrier;
- practitioner manually starts home-mod pathway.

### Branch starts only when

Practitioner selects **Start Home Modification pathway**.

### Carries forward

- participant identity
- participant goals
- relevant functional limitations
- environmental barriers
- relevant FCA findings
- risks
- current equipment where relevant

### Collects

- property details
- ownership / landlord information
- areas assessed
- environmental barriers
- access
- transfers
- bathroom/toilet
- bedroom
- entrances/exits
- circulation
- safety
- proposed modifications
- alternatives considered
- quotes / technical evidence
- consent requirements
- implementation considerations

### Report readiness gate

Recommendations remain practitioner-authored/approved. Missing landlord/owner consent, quote or technical evidence should be shown as incomplete where those items are required for the recommendation/report context.

---

# 8. AT / Home Modification report assembly

The report is an **assembly/output document**, not a second assessment.

It may reuse:

- participant identity (automatic)
- referral context (automatic/source-labelled)
- participant goals/priorities (source-labelled)
- relevant FCA findings (with provenance)
- AT/Home Mod trial findings (with provenance)
- current equipment and environment facts
- practitioner-approved recommendation and rationale

It must not:

- generate a new recommendation from raw fields;
- convert a suggested branch into a prescription;
- remove provenance from evidence;
- silently treat previous recommendations as current.

Before export, the practitioner reviews the assembled report and explicitly confirms recommendation/rationale sections.

---

# 9. Exact carry-forward matrix

Legend:
- AUTO = automatic prefill of factual value
- SRC = carry with source/provenance
- REVIEW = display prior value but require practitioner review/confirmation
- NEVER = do not infer/carry as current decision

| Information | Referral → Triage | Referral → Profile | Referral/Profile → FCA | FCA/Profile → Plan | FCA → AT/HM | Plan/FCA → Progress | Latest → Discharge |
|---|---|---|---|---|---|---|---|
| participant identity/contact | AUTO | AUTO | AUTO | AUTO | AUTO | AUTO | AUTO |
| representative/nominee | AUTO | AUTO | AUTO | AUTO | AUTO | AUTO | AUTO |
| funding/service facts | AUTO | as needed | AUTO | as needed | as needed | as needed | as needed |
| referral reason/requested service | SRC | SRC | SRC | context only | SRC | historical | summary |
| referrer-stated urgency | SRC | no | SRC | no | no | no | no |
| clinical urgency | — | — | SRC from triage | no | no | historical | only if current relevance confirmed |
| communication/access requirements | AUTO/SRC | AUTO/SRC | AUTO/SRC | AUTO/SRC | AUTO/SRC | AUTO/SRC | AUTO/SRC |
| known risks | SRC | SRC | SRC | REVIEW if used | SRC | REVIEW/current update | REVIEW current handover risk |
| current supports | SRC | SRC | SRC | SRC | SRC | update against prior | current confirmed |
| participant priorities | — | first collect | SRC | SRC → practitioner uses | SRC | compare/current | summary |
| participant-described goals | — | first collect | SRC | SRC, not final goal | SRC | compare | outcome summary |
| barriers/strengths | — | first collect | SRC | SRC | SRC | baseline/current | current relevant only |
| functional findings | — | — | first collect | SRC | SRC | baseline/current | concise relevant findings only |
| clinical interpretation | — | — | practitioner authors | REVIEW | REVIEW if needed | REVIEW/revise | REVIEW current only |
| agreed OT goals | — | — | — | practitioner approves | SRC | AUTO as goal targets | current status summary |
| intervention plan | — | — | — | practitioner authors | SRC where relevant | AUTO/SRC | summary |
| AT/HM recommendation | — | — | NEVER | NEVER | practitioner authors | previous recommendation + REVIEW | REVIEW current status |
| discharge recommendation | — | — | — | — | — | — | practitioner authors |

---

# 10. Upstream change / staleness behaviour

The carry-forward system must never silently overwrite downstream practitioner judgement.

When an upstream value changes:

### Shared factual data

Example: living situation changes.

Downstream field displays the new factual value where safe, plus:

> Source information has changed — review this field.

If the practitioner has locally edited the downstream copy, preserve their value and present the upstream change for comparison rather than overwriting.

### Source-attributed evidence

Keep the original evidence entry as historical evidence. Add/replace the upstream source entry according to source versioning, and flag any downstream interpretation that relied on the changed evidence.

### Clinical interpretation

Never overwrite. Mark:

> Upstream information changed after this interpretation was recorded — practitioner review required.

### Recommendations / decisions

Never overwrite and never silently revalidate. Mark prior recommendation as needing review if a material source changed.

### Source removed/unavailable

Do not erase downstream text. Mark the provenance reference as unavailable and require review before final export if the source is material.

---

# 11. Practitioner-review gates

Minimum gates for this first OT workflow:

## Gate A — Referral → Triage

Require enough information to identify participant, referral reason/request and consent status.

## Gate B — Triage → Assessment pathway

Require practitioner triage outcome, scope and immediate-risk response where relevant.

## Gate C — FCA finalisation

Require:
- material findings have provenance;
- practitioner has reviewed clinical interpretations;
- recommendations are practitioner-entered/approved;
- unresolved material contradictions are acknowledged;
- branch choices are explicit.

## Gate D — Plan finalisation

Require practitioner approval of goals, interventions, measures and review dates.

## Gate E — AT/HM final report

Require practitioner approval of recommendation/rationale; show incomplete evidence/trial/quote/consent states rather than filling gaps automatically.

## Gate F — Progress/Reassessment finalisation

Require current state against relevant baseline/goals and explicit approval of revised recommendations.

## Gate G — Discharge/Transfer

Require reason, outcomes, unresolved needs/risks, current recommendations and handover/consent check.

Gates should guide the practitioner and make incompleteness visible. They should not turn Vector into a clinical decision engine.

---

# 12. Key empty, error and incomplete states

## No upstream data available

Show:

> No earlier Vector information is available for this field.

Offer normal entry. Do not block simply because an upstream document is absent unless the specific workflow gate requires it.

## Upstream document incomplete

Show source fields that are confirmed; mark incomplete source sections distinctly.

Do not treat an unfinished upstream draft as finalized clinical evidence.

## Missing provenance on FCA finding

Finding remains incomplete and cannot be used as confirmed evidence in final report assembly.

## Conflicting sources

Show both source-attributed entries. Do not choose one automatically.

Provide a practitioner field to record interpretation/resolution if clinically needed.

## Changed upstream value

Show old/downstream value and current upstream value with **Review required** state.

## Missing/expired consent

Allow local draft capture where appropriate, but block information-sharing/export actions that require consent until practitioner addresses the consent state.

## Missing standardised instrument rights

State = `blocked` or `external administration`; never render proprietary questions.

## Branch suggested but not confirmed

Show as **Consider AT / Consider Home Modification**, not **AT required**.

## Branch incomplete

Allow saving. Final report/export gate identifies specific missing evidence/confirmation.

## No change on progress review

Allow practitioner to record "no material change" with supporting evidence; do not force rewritten baseline text.

## Source attachment unavailable

Keep source metadata and flag attachment unavailable. Do not silently remove the evidence relationship.

---

# 13. Mobile / field-use flow

The workflow should be usable during home visits, equipment trials and community assessment without turning the phone view into the entire desktop FCA at once.

## Mobile principles

- one domain/section at a time;
- persistent local autosave;
- clear current participant/pathway label;
- source/provenance selector adjacent to each new finding;
- quick add finding: observed / reported / interpretation / recommendation;
- compact evidence/source picker;
- quick session/progress note capture;
- branch actions available only after practitioner confirmation;
- attachments/photos remain local within Vector's privacy model unless the user explicitly exports/shares;
- long reports are review/export surfaces, not the primary field-entry experience;
- no requirement for constant network access.

## Field-visit pattern

```text
Open local OT pathway
→ choose FCA domain / AT trial / Home Mod area
→ add finding
→ choose provenance
→ save locally
→ repeat
→ later review on larger screen if desired
→ practitioner confirms interpretations/recommendations
→ assemble final document
```

---

# 14. How this should fit Vector's existing architecture

This handoff deliberately follows the existing Vector concepts rather than replacing them.

Current Vector already has:

- registry-driven documents/fields;
- `askedIn`, `rendersIn` and `informs` relationships;
- intrinsic field tiers;
- staleness/transition concepts;
- a `resolve()` prefill engine;
- a generic renderer;
- gates and transition ledger concepts;
- standalone/local operation;
- an optional on-device referral handoff snapshot.

The current on-device referral handoff only carries a small set of values (participant name, NDIS number, DOB, guardian, accommodation and referring provider). OT needs the same privacy model but a more general source-aware carry-forward contract.

Design direction:

1. Keep documents declarative/registry-driven.
2. Keep cross-document relationships in data, not hard-coded per form.
3. Generalise local carry-forward rather than making a separate OT prefill implementation.
4. Preserve field tier/source semantics.
5. Treat functional findings/evidence as reusable source-attributed objects.
6. Treat clinical interpretation and recommendations as review-gated practitioner content.
7. Keep connected/cloud organisational persistence out of this first OT workflow.

No implementation changes are specified here.

---

# 15. First implementation slice recommended from this handoff

This is not an implementation task, but the workflow is easiest to build safely in this order:

1. OT Referral root record + generalised local carry-forward envelope
2. OT Triage
3. Occupational Profile
4. FCA domain shell + Functional Activity Finding + provenance
5. Goals & Intervention Plan
6. Progress / Reassessment comparison
7. Discharge / Transfer
8. AT branch
9. Seating & Mobility sub-branch
10. Home Modification branch
11. AT / Home Modification report assembly
12. Standardised-instrument wrapper where rights/state rules are needed

The first architectural proof should be one participant moving:

```text
Referral → Triage → Profile → FCA → Plan → Progress → Discharge
```

with a single factual field, a source-attributed finding, a clinical interpretation and a recommendation each demonstrating the four different carry-forward behaviours.

---

# 16. Success criterion walkthrough

If an OT starts with a referral and later produces an FCA, intervention plan, AT recommendation, progress report and discharge summary:

### They type once

- participant identity/contact
- representative/referrer/funding facts
- communication/access requirements
- participant priorities/roles/routines/environment
- each source-attributed finding/evidence item
- each agreed goal once
- each trial result once

### Vector carries forward automatically

Only stable/shared factual data, while retaining source.

### Vector carries forward with provenance

Reported information, observations, external evidence, standardised results and trial findings.

### Vector shows for review rather than silently accepting

Clinical interpretation, previous recommendations, material risks, prior formulations and any downstream content affected by changed upstream evidence.

### The practitioner personally decides/approves

- triage outcome
- OT scope
- clinical interpretation/formulation
- agreed goals
- interventions
- AT pathway start
- seating/mobility pathway start
- home-modification pathway start
- AT prescription/recommendation
- home-modification recommendation
- revised recommendations
- discharge/transfer recommendations

That is the core Vector OT contract: **enter evidence once, reuse it transparently, preserve where it came from, and never let carry-forward masquerade as clinical judgement.**
