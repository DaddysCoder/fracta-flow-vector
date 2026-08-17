# Behaviour Support Tooling — Schema, Interface and Strategy Approval Pack v2.1

**Status:** revised for practitioner approval before product coding  
**Date:** 9 August 2026  
**Scope:** build-order steps 1–4 plus the three required Strategy Entry examples  
**Locked principle:** collect once, approve once, assemble wherever needed

**v2.1 correction:** removes participant-level plan styling and variable section order. Plan presentation is practitioner/provider controlled; participant-specific visual resources are protected implementation materials within Strategy Instances. Product branding is never placed on provider clinical documents.

## 1. Decisions requiring approval

1. One longitudinal Participant Record is the source of truth. Word documents and CRM records are controlled exports or integrations.
2. Identity data is isolated in an Identity Vault. Participant clinical content—including pseudonymised free text—and every Strategy Instance stay outside all AI workflows.
3. AI may be used only for public-source Strategy Entry research and non-participant formatting/research. Participant outputs are assembled deterministically.
4. There are three pathways: no-RP, RRP requiring Interim safeguards, and RRP identified later. A no-RP case never receives an Interim BSP or empty RRP sections.
5. The combined Assessment/FBA is completed and its analysis approved before Strategy Instance authoring for a Comprehensive or non-RP BSP. Temporary Interim safeguards are the sole exception and are not Strategy Instances.
6. Strategy Entry and Strategy Instance are separate objects, stores and approval processes.
7. The escalation table is an output assembled from already-approved records. It is not an assessment, second authoring surface or recommender.
8. Released versions are immutable. Corrections create a successor version and preserve the earlier version, approvals, lineage and export hashes.

## 2. Participant Record Schema v2

### 2.1 Common record envelope

Every record object uses the fields relevant to its type:

| Field group | Required design |
|---|---|
| Identity | `record_id`, pseudonymous `participant_key`; identifying fields exist only in the Identity Vault |
| Ownership | author, confirmer/approver, practitioner/provider, role and timestamps |
| Evidence state | `empty`, `extracted_unconfirmed`, `reported_unverified`, `confirmed_fact`, `participant_voice`, `practitioner_judgment`, `approved`, `superseded` |
| Lineage | source IDs, source locator, source date, extraction method, originating record/version |
| Transition | `carry`, `confirm`, `update`, `revise`, `new`, `retire` |
| Currency | effective date, last confirmed date, reconfirmation due date, superseding object |
| Output use | permitted output types, suppression state, accessible wording where approved |
| Audit | append-only events for create, extract, edit, confirm, approve, revoke, release, export and reconcile |

`extracted_unconfirmed` never appears in a released output. `reported_unverified` may appear only with explicit source-and-gap wording approved by the practitioner.

### 2.2 Identity Vault — separately encrypted and permissioned

- legal name, preferred name/reference and pronouns;
- NDIS number, date of birth, address and contact details;
- guardian/decision-maker, authority and legal scope;
- emergency contacts;
- distribution recipients and contact details; and
- CRM participant identifier and merge mapping.

The clinical store uses only `participant_key`. The export service resolves approved merge tokens after clinical approval. No Identity Vault field is copied into prompts, analytics, logs or the Strategy Library.

### 2.3 Clinical record modules

| Module | Core repeating objects and controls |
|---|---|
| Episode and pathway | referral, engagement date and basis, immediate safety, pathway state/history, internal targets, statutory dates and rule basis |
| Consultation | each participant/stakeholder account separately: role, relationship, setting/shift observed, mode, access support, consent/authority, exact report, examples, disagreements, follow-up |
| Source register | document/interview/observation/data source, author, date, location, relevance, reliability, currency, facts extracted, confirmation status |
| Participant profile | strengths, preferences, routines, communication, sensory/environmental needs, culture, relationships, quality of life, assent/refusal/pause signals |
| Health | health conditions, pain/sleep, health risks, emergency/clinical instructions and cross-references; health is not duplicated into escalation content |
| Diagnosis/condition | exact reported label, confirmation state, confirmer and role, date, document/author/date/location, reporter, missing confirmation reason, evidence requested, participant-specific presentation authored/approved by practitioner |
| Medication | name/dose/route/frequency/purpose, prescriber/source verification, purpose clarity, potential chemical-restraint review and clinician-owned monitoring |
| Behaviour | one object per observable behaviour: approved label/definition, frequency, duration, latency, intensity, contexts, setting events, antecedents, consequences, risks, maintaining variables/hypotheses, recovery and evidence maturity |
| Assessment/FBA | scope, methods, evidence records, direct/indirect data, discrepancies, pattern analysis, competing hypotheses, evidence for/against, formulation, practitioner conclusion and approval |
| Goals | participant priority, accessible wording, type, baseline, target, timeframe, measure, agreement, approved FBA/formulation or quality-of-life link |
| Interim safeguards | immediate rationale, known preferences, source, temporary instruction/avoidance, implementer/setting, review, data to collect, explicit unassessed label and post-FBA disposition |
| Strategy Instances | protected record pinning Entry ID/version, clinical rationale, creative vehicle and separate vehicle rationale, adaptations, context-fit result, instructions, measures, fidelity, cadence, attached custom implementation resources/visuals, author, approval and review |
| Safety/response | approved risk controls, safe proximity/position/exits, behaviour-specific actions/avoidances, escalation thresholds and recovery/re-engagement |
| RRP governance | possible/confirmed practice, classification rationale, type, provider/setting, authorisation, consent, lodgement, reporting, safeguards, monitoring, reduction/elimination and practice-to-cease resolution as distinct records |
| Implementation | responsible people, training, competency, fidelity, barriers, supervision, data burden, monitoring cadence and early-review triggers |
| Outputs/releases | output type/audience, included object versions, fixed template version, provider brand-profile version, inserted resource versions, gate results, rendered review, approval, immutable version, hash, distribution and CRM receipt |

### 2.4 Diagnosis output rule

An unconfirmed diagnosis is never converted into fact. The approved output pattern is:

> “[Condition] was reported by [source/role] on [date if known]. The confirming record has not been sighted. [Evidence] was requested from [person/service] on [date]. The current gap is [gap]. This record does not treat the diagnosis as confirmed.”

The condition library supplies authoritative plain-language references only. It never supplies a participant diagnosis, diagnostic criteria or inferred presentation.

## 3. Compliance Map v2 and pathway engine

### 3.1 State machine

| State | Entry | Permitted work | Hard release rule | Exit |
|---|---|---|---|---|
| `intake_screening` | referral opened | identity, consent, immediate risk, source collection, RRP screening | no BSP release | practitioner records `none`, `possible/unclear` or `confirmed` |
| `no_rp_assessment` | none identified and screening approved | combined Assessment/FBA | no Interim; no plan strategies before FBA approval | approved analysis |
| `no_rp_authoring` | approved FBA/analysis | goals and Strategy Instances | omit every RRP/RRP-lodgement section | non-RP BSP release |
| `possible_rp_review` | practice or medication purpose unresolved | information requests, immediate non-restrictive safeguards, classification | blocks final no-RP release; no keyword classification | resolved to no-RP or confirmed RRP |
| `rrp_interim` | RRP confirmed and Interim applicable | temporary safeguards, RRP protocol/governance, assessment plan | no generated function, formulation or Strategy Instance | Interim release and continuing FBA |
| `rrp_assessment` | assessment underway | combined Assessment/FBA | Comprehensive strategies locked | approved analysis |
| `rrp_comprehensive_authoring` | approved FBA/analysis | goals, Strategy Instances, RRP protocols and reduction/elimination | all applicable RRP gates pass | Comprehensive release |
| `released` | rendered output approved | monitor/review; immutable snapshot | changes cannot mutate release | successor draft or closure |
| `rrp_identified_later` | possible RRP found after no-RP release | preserve existing assessment/plan lineage; reopen classification and safeguards | previous release remains immutable; current final release blocked | no-RP resolution or RRP branch |

### 3.2 Common final-BSP gates

- participant involvement is accessible, or attempts/barriers are recorded;
- factual and clinical claims have allowable evidence states and traceable sources;
- diagnosis provenance is complete wherever a diagnosis is referenced;
- behaviours are observable and measurable, with risk and data limitations recorded;
- Assessment/FBA conclusion and formulation are practitioner-authored and separately approved;
- goals and strategies link to approved analysis or an explicit participant quality-of-life rationale;
- implementation ownership, training/fidelity and outcome monitoring are defined;
- escalation content has passed an accuracy/safety review; and
- practitioner has reviewed the rendered output before release.

### 3.3 Path-specific gates

| Gate | No-RP BSP | Interim RRP BSP | Comprehensive RRP BSP |
|---|---:|---:|---:|
| Approved RRP screening | required: none identified | required: RRP/uncertainty captured | required: current classification |
| Interim BSP | prohibited | applicable | superseded/reconciled |
| Approved FBA before authoring strategies | required | not required for temporary safeguards | required |
| Strategy Instances | required as applicable | prohibited | required as applicable |
| RRP protocol/governance | omitted | required | required |
| Reduction/elimination | omitted | temporary reduction actions | staged plan required |
| Interim item disposition | n/a | pending | each item `replace`, `retain_with_new_justification`, `revise` or `retire` |
| One-/six-month date | internal quality target only | statutory due date where applicable | statutory due date where applicable |

Authorisation, participant/decision-maker consultation or consent, Commission lodgement, monthly reporting and practice-to-cease resolution remain separate fields. Completion of one never implies completion of another.

## 4. Version and audit model

### 4.1 Drafts and approvals

- Mutable draft objects use optimistic locking and retain revision history.
- Clinical approvals pin the exact object version, approver, scope and time.
- An approved FBA version is a dependency of goals and Strategy Instances.
- Editing an approved upstream object creates a new version and flags dependants `reconfirmation_required`; it does not silently rewrite them.
- Release approval pins every included object/version plus template and renderer versions.

### 4.2 Released output

Each release stores `release_id`, output type, pathway, participant key, merge receipt (not identity values), included object/version manifest, approver, date/time, export formats, content hash, template/renderer version, recipients and delivery receipts. A change creates a successor release linked by `supersedes_release_id`.

External Word edits are imported as a source/diff and reconciled into the clinical record. They never silently replace the source of truth. CRM writes are append-only or explicitly versioned and retain an external receipt.

## 5. Combined Behaviour Support Assessment/FBA schema

### 5.1 Workspace sections

1. **Scope and participant voice:** referral questions, strengths, preferences, goals, accessible participation and recording preference.
2. **People and settings:** stakeholder map, settings/shifts actually observed and missing perspectives.
3. **Sources and methods:** documents, interviews, direct observations, incident/structured data, method dates and assessor.
4. **Behaviour objects:** operational definition; baseline; frequency/duration/latency/intensity; context; setting events; antecedents; consequences; risk; recovery; measurement suitability.
5. **Observation scaffold:** yes/no/unanswered for facial expression, gaze, voice, speech, posture/tension, movement/pacing/freezing, repetition, withdrawal, exit-seeking, proximity tolerance, object interaction, existing self-regulation and other observable signs. `yes` requires participant-specific observable wording; `no` suppresses; unanswered remains a gap.
6. **Evidence reconciliation:** every claim remains attributed; agreement, contradiction, evidence strength, relevance/currency and follow-up are visible.
7. **Pattern analysis:** practitioner-selected visual summaries; no automated function calculation.
8. **Competing hypotheses and formulation:** evidence for/against, uncertainty, broader context and discipline referrals.
9. **Practitioner conclusion:** authored functions/maintaining variables, formulation, limits and approval.
10. **Downstream preview:** exact approved fields proposed for FBA report, BSP, snapshot/safety plan and staff materials.

### 5.2 Escalation-table assembly

The output engine groups practitioner-approved behaviour labels only when their escalation and response patterns are genuinely shared. It then assembles early change, escalation, high-risk and recovery rows from:

- behaviour observations and recovery records;
- preferred communication profile;
- safety/risk controls for proximity, positioning and exits; and
- approved behaviour-specific actions and actions to avoid.

Health remains in Health and may only be cross-referenced to a separately authorised emergency/clinical instruction. Empty, irrelevant and unanswered rows are omitted. The final screen permits edit, suppress and approve for accuracy/safety; it asks no new clinical questions and provides no recommendations.

## 6. Tablet-first interaction decisions

### 6.1 Navigation

- persistent left rail on landscape tablet and bottom navigation on portrait;
- top status strip: pathway, sync/offline state, completeness, unresolved hard gates and next safe action;
- one question cluster per card, large tap targets, save-and-resume and autosave;
- evidence/source drawer available from every claim without cluttering participant-facing views.

### 6.2 Session modes

| Mode | Behaviour |
|---|---|
| Shared participant mode | plain-language cards, accessible choices, visual ranking, pause/stop control and minimal clinical text |
| Quiet capture | timestamped private markers with a few words; long fields hidden; always creates a post-session completion task |
| Protected notes/dictation | only inside approved provider-controlled infrastructure with consent, retention and processing controls; never routed to general AI |
| Field data | quick event/ABC, frequency, duration, latency, intensity, recovery, observer and completeness flag; offline-capable |
| Reconciliation | stakeholder lanes side-by-side with agreement, conflict and missing-evidence controls; practitioner authors the reconciled finding |
| Analysis studio | pattern views, competing hypotheses, evidence for/against and practitioner-authored conclusion |
| Approval/preview | source-aware review, dependent-output preview, edit/suppress/approve and rendered DOCX check |

### 6.3 Word and CRM

- DOCX is generated deterministically from approved content, with non-applicable sections omitted.
- Structured JSON/API mappings use stable IDs, versions, states and source references.
- CRM adapters may pull identity into the Vault and push approved notes/final attachments; they do not turn the CRM into the clinical authoring engine.
- Poor-connectivity operation uses encrypted local storage, explicit pending/synced/failed states and idempotent sync to prevent duplicate observations.

### 6.4 Fixed plan structure, provider presentation and strategy resources

#### Fixed structure

- Every output type has one controlled section order. Practitioners do not reorder a plan around a participant or select a different visual layout family.
- All plans of the same type use the same sequence. The no-RP, Interim RRP and Comprehensive RRP templates retain their own pathway-specific fixed structures because their required content differs.
- Non-applicable content is omitted only according to pathway and compliance rules. Omission never causes the remaining sections to be rearranged.
- Participant voice and person-specific content remain central within the fixed sections; this does not extend to participant-specific typography, colour palettes, covers or document architecture.

#### Practitioner/provider control

- The practitioner authors the clinical content and decides whether an approved custom implementation resource should be displayed within the relevant strategy section, included as an appendix or exported separately.
- Fonts, provider logo, provider colours, headers, footers and formal document styling are configured once in an organisation-level provider brand profile, not selected separately for each participant.
- The provider brand profile is versioned and accessibility checked. A released document pins the exact provider brand-profile and template versions used.
- The product's own brand—including the magenta sphere—is limited to the software interface, product material and marketing. It does not appear on a provider's BSP, FBA, assessment, report, letter, strategy card or other clinical export.

#### Custom Strategy Instance resources

Participant-specific visual and accessible materials belong to the protected Strategy Instance layer. They are not a plan-design layer and they never enter an AI workflow. Examples include:

- strategy cards and step-by-step illustrated instructions;
- photographs demonstrating an environment, object, person-specific cue or completed setup;
- visual schedules, communication supports and choice materials;
- participant-specific examples, scripts, social narratives or rehearsal resources; and
- other implementation resources required to deliver the approved technique.

Each attached resource stores:

- the Strategy Instance and approved technique it implements;
- its implementation purpose rather than merely its appearance;
- creator/source, file type, version and approval state;
- accessibility and communication rationale;
- consent, image-use and distribution restrictions;
- settings and implementers authorised to use it;
- display mode: `inline illustration`, `appendix`, `separate strategy card/resource` or an approved combination;
- review date and supersession history; and
- the exact released outputs in which it appeared.

The renderer may place an approved image or preview beside its strategy instructions without changing the plan's fixed section order. A resource is included because it helps implement a Strategy Instance, not because it decorates or personalises the document.

## 7. Three complete Strategy Entry examples for approval

These are public library objects only. The examples contain no participant data, prescription or creative vehicle.

### Entry 1 — Genuine supported choice

| Field | Proposed content |
|---|---|
| ID/version/status | `SE-ANT-001` / `1.0.0` / review candidate |
| Technique/aliases | Genuine supported choice; activity choice; choice-making opportunity |
| Class/function relation | Antecedent/environmental support; `function_informed` or `function_neutral` depending on practitioner rationale—not a function filter |
| Required components | at least two genuine, available options; accessible presentation; explicit “something else/stop/not now”; selected option honoured; safety limits stated honestly |
| Conditional components | option sampling; reduced array size; visual/object/text modality; delayed-choice support |
| Optional components | choice of order, place, materials, timing or support person |
| Person prerequisites | a reliable way to select/refuse; options understandable and meaningful |
| Setting prerequisites | all offered options can actually be delivered; refusal is not punished |
| Implementer requirements | recognise assent/refusal; avoid false choices; record whether the choice was honoured |
| Contextual-fit check | options available on the actual roster; staff authority/resources sufficient; communication materials present |
| Modality/dose/embed | naturally embedded before relevant routines/opportunities; frequency is opportunity-based and individualised—no unsupported numeric dose claim |
| Evidence | Dyer, Dunlap & Winterling (1990), experimental single-case research; choice improved engagement/reduced problem behaviour in studied contexts. Generalisation beyond studied people/settings is limited and effects must be measured. |
| Outcomes | engagement/participation, latency, observable distress/behaviour, participant feedback and honoured refusals |
| Fidelity | proportion of eligible opportunities with genuine accessible options and honoured selections/refusals |
| Data burden | low: opportunity, choice offered, response honoured, brief outcome |
| Known risks | coercion through false choice; overload; disguising an unreasonable demand; withdrawing a chosen option |
| Product risk/RRP boundary | hard warning if refusal is overridden, access is restricted or choice is used to conceal a restrictive practice; practitioner classification required |
| Mapping | proactive/environmental strategies; communication/choice and control; implementation/fidelity; BSP-QEII person-centred and antecedent markers |
| Training kernel | genuine versus false choice, accessible presentation, recognising refusal, fidelity example/non-example |
| Cultural governance | no generic cultural adaptation; local meaning, authority and language belong only in the protected Instance and require participant/community-led input where relevant |

**Source:** Dyer, K., Dunlap, G., & Winterling, V. (1990). *Effects of choice making on the serious problem behaviors of students with severe handicaps.* Journal of Applied Behavior Analysis, 23, 515–524. https://doi.org/10.1901/jaba.1990.23-515

### Entry 2 — Functional Communication Training (FCT)

| Field | Proposed content |
|---|---|
| ID/version/status | `SE-SKL-001` / `1.0.0` / review candidate |
| Technique/aliases | Functional Communication Training; functional communication response training |
| Class/function relation | Function-based skill development; `function_matched` |
| Required components | approved functional assessment; accessible response easier than the behaviour; response accesses the same reinforcer/outcome; initial reliable reinforcement; prompting/fading plan; generalisation; implementer training; data |
| Conditional components | schedule thinning/tolerance teaching only after individual assessment; competing-stimulus or multiple-schedule components separately specified |
| Optional components | multiple equivalent communication modalities and natural communication partners |
| Explicit exclusion | extinction is not part of this Entry. Any extinction component is separate, evidence-reviewed and risk-gated; it is never silently added. |
| Person prerequisites | an accessible response modality; relevant outcome can be delivered safely and ethically; assent/refusal monitored |
| Setting prerequisites | implementers can recognise and promptly honour the response across required settings |
| Implementer requirements | competency-based teaching, consistent reinforcement, prompt/fade and generalisation data |
| Contextual-fit check | roster coverage, reinforcer availability, response materials, wait times and consistency across providers |
| Modality/dose/embed | teaching opportunities and reinforcement schedule are individualised from assessment; source-specific parameters are stored without converting them into a universal dose |
| Evidence | Tiger, Hanley & Bruzek (2008), practice review of behavioural literature; FCT has a substantial evidence base when function-matched. Evidence is strongest in applied behaviour-analytic severe-behaviour contexts; treatment integrity, generalisation and schedule changes materially affect outcomes. |
| Outcomes | independent functional responses, target behaviour, latency to response, generalisation, participant access/quality-of-life outcomes |
| Fidelity | correct opportunity, prompt level, functional response recognised, matched outcome delivered within defined interval, data recorded |
| Data burden | medium: trial/opportunity, prompt, response, delivery latency, outcome and context |
| Known risks | response extinction or delayed access may produce escalation; response may be more effortful than behaviour; inconsistent implementation can undermine learning |
| Product risk/RRP boundary | blocks authoring without approved function link; warning for planned denial, response blocking, forced prompting or access restriction; possible RRP must enter governance review |
| Mapping | skill development, function-based strategy, communication, implementation, monitoring and BSP-QEII function-treatment linkage |
| Training kernel | identify the response and matched outcome, teaching sequence, prompt/fade, honouring communication, generalisation, data and escalation safeguards |
| Cultural governance | no universal symbol/phrase; communication form and meaning are selected with the person and relevant communication/cultural authorities in the protected Instance |

**Source:** Tiger, J. H., Hanley, G. P., & Bruzek, J. (2008). *Functional communication training: A review and practical guide.* Behavior Analysis in Practice, 1, 16–23. https://doi.org/10.1007/BF03391716

### Entry 3 — Activity schedule / transition preview

| Field | Proposed content |
|---|---|
| ID/version/status | `SE-ANT-002` / `1.0.0` / review candidate |
| Technique/aliases | Activity schedule; visual schedule; transition preview; advance schedule |
| Class/function relation | Antecedent/predictability support; usually `function_informed` or `function_neutral`; never automatically function-matched |
| Required components | participant-accessible format; accurate current information; clear next event; agreed change signal; useful—not repetitive—notice; participant can disengage from the preview |
| Conditional components | choice within the transition; completion marker; portable cue; teaching how to use the schedule |
| Optional components | photos, objects, symbols, text, timer or calendar format according to communication access and preference |
| Person prerequisites | format can be perceived and understood; use is acceptable to the person |
| Setting prerequisites | schedule information is reliable; implementers update changes promptly; the underlying transition/demand is reasonable |
| Implementer requirements | concise preview, accurate language, honour stop/refusal, avoid repeated warnings and monitor impact |
| Contextual-fit check | roster can maintain accuracy; changes are known soon enough; format/materials available in every target setting |
| Modality/dose/embed | embedded before identified transitions at an individually useful notice interval; no universal frequency or lead time asserted |
| Evidence | Waters, Lerman & Hovanetz (2009), single-case experimental analysis: advance notice alone did not reduce transition-related problem behaviour for the studied participants, while function-based treatment did. Entry claim is therefore limited to possible predictability/engagement support, not standalone behaviour reduction. |
| Outcomes | schedule use/feedback, transition participation, latency, observable distress/behaviour, missed/avoided activities and accuracy of previews |
| Fidelity | correct information, agreed timing/format, change signal, choice/refusal honoured and no excess prompting |
| Data burden | low–medium: transition opportunity, preview accuracy/timing, response and outcome |
| Known risks | inaccurate promises, repetitive warnings that escalate distress, infantilising materials, using a schedule to compel compliance |
| Product risk/RRP boundary | warning if schedule controls access, locks sequence, blocks leaving or removes genuine choice; potential restriction requires classification |
| Mapping | antecedent/environmental support, communication/access, implementation, monitoring and BSP-QEII antecedent/person-centred markers |
| Training kernel | schedule purpose and limitations, access formats, accurate updates, change signal, refusal, example/non-example and outcome monitoring |
| Cultural governance | visual style, time concepts and who communicates changes are locally determined in the protected Instance; no generic cultural adaptation text |

**Source:** Waters, M. B., Lerman, D. C., & Hovanetz, A. N. (2009). *Separate and combined effects of visual schedules and extinction plus differential reinforcement on problem behavior occasioned by transitions.* Journal of Applied Behavior Analysis, 42, 309–313. https://doi.org/10.1901/jaba.2009.42-309

## 8. Approval checkpoint

Coding the full product and populating the wider Strategy Library remain paused. Approval is requested for:

1. the schema, pathway gates, AI boundary, audit/version model and tablet flow above; and
2. the structure and safety/evidence tone of the three Strategy Entries.

After approval, these decisions become implementation contracts. Any later change is handled as a versioned architecture decision rather than silent drift.

## 9. Official design basis checked 9 August 2026

- NDIS Quality and Safeguards Commission, *Rules for specialist behaviour support providers and NDIS behaviour support practitioners*.
- National Disability Insurance Scheme (Restrictive Practices and Behaviour Support) Rules 2018, especially sections 19–22.
- NDIS Quality and Safeguards Commission, *Behaviour support assessment, including functional behaviour assessment* guidance.
- NDIS Quality and Safeguards Commission, *Positive Behaviour Support Capability Framework*.
