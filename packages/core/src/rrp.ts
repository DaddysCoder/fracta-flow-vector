/**
 * Within an RRP (Regulated Restrictive Practice) record, these five flags
 * are independent booleans — setting one must never set another. The
 * only sanctioned way to change one is `setRrpFlag`, whose signature
 * accepts exactly one flag and one value: there is no batch-set path for
 * a well-meaning "helper" to grow into a coupling bug later.
 */
export interface RrpRecord {
  authorisation: boolean;
  consent_consultation: boolean;
  commission_lodgement: boolean;
  monthly_reporting: boolean;
  practice_to_cease: boolean;
}

export const RRP_INDEPENDENT_FLAGS: readonly (keyof RrpRecord)[] = [
  "authorisation",
  "consent_consultation",
  "commission_lodgement",
  "monthly_reporting",
  "practice_to_cease",
];

export function createRrpRecord(): RrpRecord {
  return {
    authorisation: false,
    consent_consultation: false,
    commission_lodgement: false,
    monthly_reporting: false,
    practice_to_cease: false,
  };
}

/** Returns a new record with exactly `flag` changed; every other flag is
 * carried over unchanged. */
export function setRrpFlag(record: RrpRecord, flag: keyof RrpRecord, value: boolean): RrpRecord {
  return { ...record, [flag]: value };
}
