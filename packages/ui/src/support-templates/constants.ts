import type { StructColumn } from "./types.js";

export const RRP_TYPES = [
  "Seclusion",
  "Chemical restraint",
  "Mechanical restraint",
  "Physical restraint",
  "Environmental restraint",
] as const;

export const RRP_FIELD_DEFS: Array<[string, string]> = [
  ["whatHappens", "What happens"],
  ["startDate", "Since"],
  ["timing", "Timing"],
  ["evidence", "Evidence collected"],
  ["rationale", "Rationale"],
  ["leastRestrictive", "Least restrictive analysis"],
  ["reduction", "Plan to reduce or eliminate"],
  ["duration", "Duration and review date"],
  ["impacts", "Impacts and safeguards"],
  ["procedure", "Procedure"],
  ["monitoring", "Training and monitoring"],
];

export const SOURCE_COLUMNS: StructColumn[] = [
  { key: "docName", label: "Document name" },
  { key: "dateMade", label: "Date made" },
  { key: "authorName", label: "Author name" },
  { key: "authorRole", label: "Author role" },
  { key: "authorCompany", label: "Company / service" },
  { key: "about", label: "What it's about (brief)", multiline: true },
];

export const CONSULT_COLUMNS: StructColumn[] = [
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "date", label: "Date and mode" },
  { key: "whatProvided", label: "What was discussed / provided", multiline: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
];

export const DIFF_FIELD_DEFS: Array<[string, string]> = [
  ["dateEngaged", "Specialist behaviour support provider engagement date"],
  ["practitionerFirstName", "Practitioner name"],
  ["practitionerRegistration", "Practitioner NDIS registration number"],
  ["practitionerPhone", "Practitioner contact number"],
  ["strengths", "Strengths and aspirations"],
  ["comms", "Communication"],
  ["routine", "Routine and sensory"],
  ["likesDislikes", "Likes and dislikes"],
];
