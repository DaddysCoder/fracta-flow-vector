import type { Brand } from "@pbs/export";
import {
  formatSupportTemplateLine,
  renderSupportTemplateBlankDocxBlob,
  renderSupportTemplateDocxBlob,
  type SupportTemplateDocxSection,
} from "@pbs/export";
import { RRP_FIELD_DEFS, RRP_TYPES } from "./constants.js";
import type { SupportTemplateState, TemplateConfig } from "./types.js";

function line(value: string | undefined): string {
  return formatSupportTemplateLine(value);
}

function buildSections(state: SupportTemplateState): SupportTemplateDocxSection[] {
  const v = state.v;
  const sections: SupportTemplateDocxSection[] = [
    {
      title: "Person, plan and practitioner",
      lines: [
        `Participant: ${line(v.name)}`,
        `NDIS: ${line(v.ndis)}`,
        `Date of birth: ${line(v.dob)}`,
        `Person responsible: ${line(v.personResponsible)}`,
        `Accommodation: ${line(v.accommodation)}`,
        `Provider: ${line(v.provider)}`,
        `Engagement date: ${line(v.dateEngaged)}`,
        `Plan release date: ${line(v.dateReleased)}`,
        `Review / due date: ${line(v.dateReplace)}`,
        `Practitioner: ${line(v.practitionerFirstName)}`,
        `Registration: ${line(v.practitionerRegistration)}`,
        `Contact: ${line(v.practitionerPhone)}`,
        ...(v.assessmentBasis ? [`Assessment basis: ${line(v.assessmentBasis)}`] : []),
      ],
    },
  ];

  for (const [key, label] of Object.entries({
    strengths: "Strengths and aspirations",
    comms: "Communication",
    routine: "Routine and sensory",
    likesDislikes: "Likes and dislikes",
    health: "Medical and health history",
    relationships: "Relationships and support network",
    dailyStructure: "Education, employment and daily structure",
    culture: "Cultural and spiritual considerations",
    predisposing: "Predisposing factors",
    precipitating: "Precipitating factors",
    protective: "Protective factors",
    perpetuating: "Maintaining factors",
    strategiesTrialled: "Strategies already trialled",
    environmental: "Environmental strategies",
    communicationChoice: "Communication and choice",
    regulating: "Regulating strategies",
    healthSensory: "Health or sensory",
    socialCommunity: "Social and community",
    learning: "Learning",
    earlyWarning: "Early warning signs",
    atEarly: "At early warning signs",
    escalation: "If escalation continues",
    peak: "Peak",
    recovery: "Recovery",
    implementation: "Implementation support and monitoring",
    participantGoals: "Participant goals",
    outcomeMeasures: "Outcome measures",
    dataCollection: "Data collection method",
    reviewSchedule: "Review schedule",
  })) {
    if (v[key]) sections.push({ title: label, lines: [line(v[key])] });
  }

  if (state.behaviours.length > 0) {
    sections.push({
      title: "Behaviours and risks",
      lines: state.behaviours.flatMap((b, i) => [
        `${i + 1}. ${line(b.name)}`,
        `Description: ${line(b.desc)}`,
        `Frequency / duration: ${line(b.freq)}`,
        `Intensity and risk: ${line(b.intensity)}`,
        `Triggers: ${line(b.triggers)}`,
      ]),
    });
  }

  for (const [listKey, title] of [
    ["sources", "Document register"],
    ["consultPerson", "Consultation with participant"],
    ["consultOthers", "Consultation with others"],
  ] as const) {
    const rows = state.structLists[listKey] ?? [];
    if (rows.length === 0) continue;
    sections.push({
      title,
      lines: rows.map((row, i) => `${i + 1}. ${Object.values(row).filter(Boolean).join(" · ") || line(undefined)}`),
    });
  }

  const activeRrp = RRP_TYPES.filter((t) => state.rrpTypes[t]);
  if (activeRrp.length > 0) {
    sections.push({
      title: "Regulated restrictive practices",
      lines: activeRrp.flatMap((type) => [
        type,
        ...RRP_FIELD_DEFS.map(([key, label]) => `${label}: ${line(state.rrpFields[type]?.[key])}`),
      ]),
    });
  }

  for (const [key, title] of [
    ["cease", "Practices to cease"],
    ["distribution", "Plan distributed to"],
  ] as const) {
    const items = state.lists[key] ?? [];
    if (items.length === 0) continue;
    sections.push({ title, lines: items.map((item, i) => `${i + 1}. ${item}`) });
  }

  return sections;
}

export async function renderSupportTemplateDocx(
  config: TemplateConfig,
  state: SupportTemplateState,
  brand: Brand,
): Promise<Blob> {
  return renderSupportTemplateDocxBlob({
    eyebrow: config.eyebrow,
    brand,
    sections: buildSections(state),
  });
}

export async function renderSupportTemplateBlankDocx(config: TemplateConfig, brand: Brand): Promise<Blob> {
  return renderSupportTemplateBlankDocxBlob(config.eyebrow, brand);
}
