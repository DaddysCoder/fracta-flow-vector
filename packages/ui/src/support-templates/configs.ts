import { CONSULT_COLUMNS, DIFF_FIELD_DEFS, RRP_TYPES, SOURCE_COLUMNS } from "./constants.js";
import {
  buildTemplateContext,
  interimTag,
  referralDefault,
  referralTag,
} from "./prefill.js";
import type { TemplateBuildContext, TemplateConfig, TemplateStep } from "./types.js";

function personDetailsStep(
  ctx: TemplateBuildContext,
  note: string,
  extras: TemplateStep["text"] = [],
): TemplateStep {
  const { referral, interim, hasInterim } = ctx;
  const iv = interim?.v ?? {};
  return {
    code: "01",
    title: "Person, plan and practitioner details",
    note,
    text: [
      { key: "name", label: "Participant name", defaultValue: referralDefault("name", referral), tag: referralTag("name", referral) },
      { key: "ndis", label: "NDIS number", defaultValue: referralDefault("ndis", referral), tag: referralTag("ndis", referral) },
      { key: "dob", label: "Date of birth", defaultValue: referralDefault("dob", referral), tag: referralTag("dob", referral) },
      {
        key: "personResponsible",
        label: "Person responsible / guardian",
        defaultValue: referralDefault("personResponsible", referral),
        tag: referralTag("personResponsible", referral),
      },
      {
        key: "accommodation",
        label: "Address / accommodation",
        defaultValue: referralDefault("accommodation", referral),
        tag: referralTag("accommodation", referral),
      },
      {
        key: "provider",
        label: "Specialist Behaviour Support Provider",
        defaultValue: referralDefault("provider", referral),
        tag: referralTag("provider", referral),
      },
      ...extras,
      {
        key: "practitionerFirstName",
        label: "Practitioner name",
        defaultValue: iv.practitionerFirstName ?? "",
        tag: hasInterim && iv.practitionerFirstName ? "FROM INTERIM" : null,
      },
      {
        key: "practitionerRegistration",
        label: "Practitioner NDIS registration number",
        defaultValue: iv.practitionerRegistration ?? "",
        tag: hasInterim && iv.practitionerRegistration ? "FROM INTERIM" : null,
      },
      {
        key: "practitionerPhone",
        label: "Practitioner contact number",
        defaultValue: iv.practitionerPhone ?? "",
        tag: hasInterim && iv.practitionerPhone ? "FROM INTERIM" : null,
      },
    ],
  };
}

function sourcesStep(note?: string): TemplateStep {
  return {
    code: "02",
    title: "Other sources of information",
    note: note ?? "Every prior report, referral document or record reviewed — add one entry per source.",
    struct: [{ key: "sources", label: "Document register", columns: SOURCE_COLUMNS }],
  };
}

function consultStep(note?: string): TemplateStep {
  return {
    code: "03",
    title: "Consultation log",
    note,
    struct: [
      { key: "consultPerson", label: "Consultation with the participant", columns: CONSULT_COLUMNS },
      { key: "consultOthers", label: "Consultation with others", columns: CONSULT_COLUMNS },
    ],
  };
}

function behavioursStep(): TemplateStep {
  return { code: "05", title: "Behaviours and risks of harm", kind: "behaviours" };
}

function rrpStep(): TemplateStep {
  return {
    code: "08",
    title: "Regulated restrictive practices",
    kind: "rrp",
    note: "Describe each restrictive practice in use, and how it will be reduced or eliminated.",
  };
}

function ceaseStep(): TemplateStep {
  return {
    code: "09",
    title: "Practices to cease, and implementation",
    lists: [
      {
        key: "cease",
        label: "Practices to be ceased immediately (unauthorised)",
        placeholder: "e.g. removing workshop tools following incidents",
      },
    ],
    longs: [
      {
        key: "implementation",
        label: "Implementation support and monitoring",
        defaultValue: "",
      },
    ],
  };
}

function declarationStep(summaryNote?: string): TemplateStep {
  return {
    code: "99",
    title: "Declaration and summary",
    kind: "summary",
    note: summaryNote,
    confirm: [
      "declared",
      "I declare this plan was developed in accordance with the NDIS Practice Standards and applicable state authorisation requirements, and is accurate to the best of my knowledge.",
    ],
    selfDeclare: true,
  };
}

export const GENERIC_BSP_CONFIG: TemplateConfig = {
  id: "behaviour-support-plan",
  eyebrow: "BEHAVIOUR SUPPORT PLAN",
  storageKey: "vectorBehaviourSupportPlanData",
  saveLabel: "Save Behaviour Support Plan",
  completionTitle: "Behaviour Support Plan saved",
  completionNote:
    "This is a useful Vector template for participants without regulated restrictive practice. It is not a third formal NDIS Commission BSP type.",
  steps: (ctx) => [
    personDetailsStep(
      ctx,
      "Fields tagged FROM REFERRAL are filled from your Vector Referral and can be edited here. This template is for participants with no regulated restrictive practice. Completing within six months of provider engagement is good practice — it is not the same statutory timeframe that applies to regulated restrictive practice plans.",
      [
        {
          key: "dateEngaged",
          label: "Specialist behaviour support provider engagement date",
          defaultValue: "",
        },
        { key: "dateReleased", label: "Date of plan release", defaultValue: "" },
        {
          key: "dateReplace",
          label: "Plan review target (good practice: within 6 months of engagement)",
          defaultValue: "",
        },
      ],
    ),
    sourcesStep(),
    consultStep(),
    {
      code: "04",
      title: "About the person",
      longs: [
        { key: "strengths", label: "Strengths and aspirations" },
        { key: "comms", label: "Communication" },
        { key: "routine", label: "Routine and sensory" },
        { key: "likesDislikes", label: "Likes and dislikes" },
        { key: "health", label: "Medical and health history" },
        { key: "relationships", label: "Relationships and support network" },
        { key: "dailyStructure", label: "Education, employment and daily structure" },
        { key: "culture", label: "Cultural and spiritual considerations" },
      ],
    },
    behavioursStep(),
    {
      code: "06",
      title: "Function and contributing factors",
      note: "What seems to make this behaviour more or less likely, based on observation and consultation so far.",
      longs: [
        { key: "predisposing", label: "Predisposing factors" },
        { key: "precipitating", label: "Precipitating factors (triggers)" },
        { key: "protective", label: "Protective factors" },
        { key: "perpetuating", label: "Maintaining factors" },
        { key: "strategiesTrialled", label: "Strategies already trialled" },
      ],
    },
    {
      code: "07",
      title: "Proactive strategies",
      longs: [
        { key: "environmental", label: "Environmental" },
        { key: "communicationChoice", label: "Communication and choice" },
        { key: "regulating", label: "Regulating" },
        { key: "healthSensory", label: "Health or sensory" },
        { key: "socialCommunity", label: "Social and community" },
        { key: "learning", label: "Learning" },
      ],
    },
    {
      code: "08",
      title: "Responsive strategies",
      longs: [
        { key: "earlyWarning", label: "Early warning signs" },
        { key: "atEarly", label: "At early warning signs" },
        { key: "escalation", label: "If escalation continues" },
        { key: "peak", label: "Peak" },
        { key: "recovery", label: "Recovery" },
      ],
    },
    {
      code: "09",
      title: "Practices to cease, and implementation",
      lists: [
        {
          key: "cease",
          label: "Practices to be ceased immediately (unauthorised)",
          placeholder: "e.g. removing workshop tools following incidents",
        },
      ],
      longs: [{ key: "implementation", label: "Implementation support and monitoring" }],
    },
    declarationStep(),
  ],
  summaryRows: (s) => [
    { k: "Person details, practitioner, provider", v: "Direct" },
    { k: "Sources reviewed", v: `${(s.structLists.sources ?? []).length} documents` },
    {
      k: "Consultation log",
      v: `${(s.structLists.consultPerson ?? []).length + (s.structLists.consultOthers ?? []).length} entries`,
    },
    { k: "Behaviours, risks, triggers", v: `${s.behaviours.length} logged` },
    { k: "Proactive + responsive strategies", v: "Complete" },
  ],
};

export const INTERIM_BSP_CONFIG: TemplateConfig = {
  id: "interim-behaviour-support-plan",
  eyebrow: "INTERIM BEHAVIOUR SUPPORT PLAN",
  storageKey: "vectorInterimBspData",
  saveLabel: "Save Interim BSP",
  completionTitle: "Interim BSP saved",
  completionNote:
    "This plan is brief by design and holds while the fuller assessment is underway. Its details can carry into the Comprehensive BSP when you start one.",
  steps: (ctx) => [
    personDetailsStep(
      ctx,
      "Fields tagged FROM REFERRAL are filled from your Vector Referral and can be edited here. An Interim BSP holds a restrictive practice safely while fuller assessment is underway — it can be started at any point in that process, with no prerequisite assessment or saved referral required.",
      [
        {
          key: "dateEngaged",
          label: "Specialist behaviour support provider engagement date",
          defaultValue: "",
        },
        { key: "dateReleased", label: "Date of plan release", defaultValue: "" },
        {
          key: "dateReplace",
          label: "Interim BSP due by (within 1 month of provider engagement)",
          defaultValue: "",
        },
      ],
    ),
    sourcesStep(),
    consultStep("Accumulates across the engagement — continues into the Comprehensive BSP rather than restarting."),
    {
      code: "04",
      title: "About the person",
      longs: [
        { key: "strengths", label: "Strengths and aspirations" },
        { key: "comms", label: "Communication" },
        { key: "routine", label: "Routine and sensory" },
        { key: "likesDislikes", label: "Likes and dislikes" },
      ],
    },
    behavioursStep(),
    {
      code: "06",
      title: "Proactive strategies",
      note: "Based on what you know so far — to be reviewed once the fuller assessment is complete.",
      longs: [
        { key: "environmental", label: "Environmental" },
        { key: "communicationChoice", label: "Communication and choice" },
        { key: "regulating", label: "Regulating" },
        { key: "healthSensory", label: "Health or sensory" },
        { key: "socialCommunity", label: "Social and community" },
        { key: "learning", label: "Learning" },
      ],
    },
    {
      code: "07",
      title: "Responsive strategies",
      longs: [
        { key: "earlyWarning", label: "Early warning signs" },
        { key: "atEarly", label: "At early warning signs" },
        { key: "escalation", label: "If escalation continues" },
        { key: "peak", label: "Peak" },
        { key: "recovery", label: "Recovery" },
      ],
    },
    rrpStep(),
    ceaseStep(),
    declarationStep(
      "Function, formulation and full goals are not part of an Interim BSP by design — the Comprehensive BSP develops these once assessment is complete.",
    ),
  ],
  summaryRows: (s) => [
    { k: "Person details, practitioner, provider", v: "Direct" },
    { k: "Sources reviewed", v: `${(s.structLists.sources ?? []).length} documents` },
    {
      k: "Consultation log",
      v: `${(s.structLists.consultPerson ?? []).length + (s.structLists.consultOthers ?? []).length} entries — accumulates`,
    },
    { k: "Behaviours, risks, triggers", v: `${s.behaviours.length} logged — confirmed and refined at Comprehensive` },
    { k: "Proactive + responsive strategies", v: "Recorded, to revise once assessment is complete" },
    { k: "Restrictive practices", v: RRP_TYPES.filter((t) => s.rrpTypes[t]).join(", ") || "None recorded" },
  ],
};

export const COMPREHENSIVE_BSP_CONFIG: TemplateConfig = {
  id: "comprehensive-behaviour-support-plan",
  eyebrow: "COMPREHENSIVE BEHAVIOUR SUPPORT PLAN",
  storageKey: "vectorComprehensiveBspData",
  saveLabel: "Save Comprehensive BSP",
  completionTitle: "Comprehensive BSP saved",
  completionNote: "This is the final plan, superseding any Interim BSP.",
  steps: (ctx) => {
    const { interim, hasInterim } = ctx;
    const iv = interim?.v ?? {};
    const steps: TemplateStep[] = [
      personDetailsStep(
        ctx,
        "Fields tagged FROM REFERRAL come from your Vector Referral; fields tagged FROM INTERIM carry from a saved Interim BSP in this browser if one exists. No saved Interim is required to start.",
        [
          {
            key: "dateEngaged",
            label: "Specialist behaviour support provider engagement date",
            defaultValue: iv.dateEngaged ?? "",
            tag: interimTag(iv.dateEngaged),
          },
          { key: "dateReleased", label: "Date of plan release", defaultValue: "" },
          { key: "dateReplace", label: "Comprehensive BSP due by (within 6 months of provider engagement)", defaultValue: "" },
          {
            key: "assessmentBasis",
            label: "Behaviour support assessment basis (including FBA reference, date or source)",
            defaultValue: "",
          },
        ],
      ),
      sourcesStep("Every prior report, referral document or record reviewed — including any already logged at Interim."),
      consultStep("Accumulates across the whole engagement, including consultation logged at Interim."),
      {
        code: "04",
        title: "About the person",
        note: "The fullest version of this section across the three plans.",
        longs: [
          { key: "strengths", label: "Strengths and aspirations", defaultValue: iv.strengths ?? "", tag: interimTag(iv.strengths) },
          { key: "comms", label: "Communication", defaultValue: iv.comms ?? "", tag: interimTag(iv.comms) },
          { key: "routine", label: "Routine and sensory", defaultValue: iv.routine ?? "", tag: interimTag(iv.routine) },
          { key: "likesDislikes", label: "Likes and dislikes", defaultValue: iv.likesDislikes ?? "", tag: interimTag(iv.likesDislikes) },
          { key: "health", label: "Medical and health history" },
          { key: "relationships", label: "Relationships and support network" },
          { key: "dailyStructure", label: "Education, employment and daily structure" },
          { key: "culture", label: "Cultural and spiritual considerations" },
        ],
      },
      behavioursStep(),
      {
        code: "06",
        title: "Function and contributing factors",
        longs: [
          { key: "predisposing", label: "Predisposing factors" },
          { key: "precipitating", label: "Precipitating factors (triggers)" },
          { key: "protective", label: "Protective factors" },
          { key: "perpetuating", label: "Maintaining factors" },
          { key: "strategiesTrialled", label: "Strategies already trialled" },
        ],
      },
      {
        code: "07",
        title: "Proactive strategies",
        longs: [
          { key: "environmental", label: "Environmental" },
          { key: "communicationChoice", label: "Communication and choice" },
          { key: "regulating", label: "Regulating" },
          { key: "healthSensory", label: "Health or sensory" },
          { key: "socialCommunity", label: "Social and community" },
          { key: "learning", label: "Learning" },
        ],
      },
      {
        code: "08",
        title: "Responsive strategies",
        longs: [
          { key: "earlyWarning", label: "Early warning signs" },
          { key: "atEarly", label: "At early warning signs" },
          { key: "escalation", label: "If escalation continues" },
          { key: "peak", label: "Peak" },
          { key: "recovery", label: "Recovery" },
        ],
      },
      rrpStep(),
      ceaseStep(),
      {
        code: "11",
        title: "Goals and outcome measures",
        note: "What this plan is working toward, and how progress will be recognised.",
        longs: [
          { key: "participantGoals", label: "Participant goals related to behaviour support" },
          { key: "outcomeMeasures", label: "How success will be measured" },
        ],
      },
      {
        code: "12",
        title: "Monitoring, review and distribution",
        longs: [
          { key: "dataCollection", label: "Ongoing data collection method" },
          { key: "reviewSchedule", label: "Review schedule" },
        ],
        lists: [
          {
            key: "distribution",
            label: "Plan distributed to",
            placeholder: "e.g. participant, guardian, support coordinator, support workers",
          },
        ],
      },
    ];

    if (hasInterim) {
      steps.push({
        code: "13",
        title: "Changes since the Interim BSP",
        kind: "diff",
        note: "Every field carried from the Interim BSP, compared against what stands in this plan now. Review before declaring.",
      });
    }

    steps.push(declarationStep());
    return steps;
  },
  summaryRows: (s) => [
    { k: "Person details, practitioner, provider", v: "Direct" },
    { k: "Sources reviewed", v: `${(s.structLists.sources ?? []).length} documents` },
    {
      k: "Consultation log",
      v: `${(s.structLists.consultPerson ?? []).length + (s.structLists.consultOthers ?? []).length} entries`,
    },
    { k: "Behaviours, risks, triggers", v: `${s.behaviours.length} logged — finalised` },
    { k: "Restrictive practices", v: RRP_TYPES.filter((t) => s.rrpTypes[t]).join(", ") || "None recorded" },
    { k: "Goals and outcome measures", v: "Direct" },
    { k: "Monitoring, review and distribution", v: `${(s.lists.distribution ?? []).length} recipients` },
  ],
};

export const SUPPORT_TEMPLATE_CONFIGS = {
  "behaviour-support-plan": GENERIC_BSP_CONFIG,
  "interim-behaviour-support-plan": INTERIM_BSP_CONFIG,
  "comprehensive-behaviour-support-plan": COMPREHENSIVE_BSP_CONFIG,
} as const;

export type SupportTemplateId = keyof typeof SUPPORT_TEMPLATE_CONFIGS;

export function getTemplateConfig(id: SupportTemplateId): TemplateConfig {
  return SUPPORT_TEMPLATE_CONFIGS[id];
}

export function buildInitialStateFromInterim(interim: ReturnType<typeof buildTemplateContext>["interim"]) {
  if (!interim) return null;
  return {
    structLists: { ...interim.structLists },
    behaviours: interim.behaviours.map((b) => ({ ...b })),
    rrpTypes: { ...interim.rrpTypes },
    rrpFields: JSON.parse(JSON.stringify(interim.rrpFields)) as Record<string, Record<string, string>>,
    lists: { cease: [...(interim.lists.cease ?? [])], distribution: [...(interim.lists.distribution ?? [])] },
  };
}

export { DIFF_FIELD_DEFS };
