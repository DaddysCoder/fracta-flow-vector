/**
 * Deployment mode is a capability set, not a separate codebase.
 *
 * standalone — MD-005/MD-006. Every tool works alone as a manual form and
 *   template. Cross-fill between standalone tools is LOCKED OFF. This is not a
 *   degraded build; it is the correct behaviour for the standalone edition.
 * connected — the governed PBS workflow. One participant record, explicit
 *   transitions, enforced approval gates.
 * embedded — as connected, plus an external identity/record adapter supplied by
 *   a host CRM. MD-025: the workflow must work beside an existing CRM.
 */
export type Mode = 'standalone' | 'connected' | 'embedded';

export interface Capabilities {
  /** Values may be resolved from other documents in the participant record. */
  crossDocumentPrefill: boolean;
  /** Clinical field movements are recorded in the append-only ledger. */
  transitionLedger: boolean;
  /** Identity is held separately from the clinical record (MD-023). */
  identityVault: boolean;
  /** Exports may use the provider's brand profile instead of Fracta Flow (MD-009). */
  providerBrandProfile: boolean;
}

export const CAPABILITIES: Record<Mode, Capabilities> = {
  standalone: {
    crossDocumentPrefill: false,
    transitionLedger: false,
    identityVault: false,
    providerBrandProfile: false,
  },
  connected: {
    crossDocumentPrefill: true,
    transitionLedger: true,
    identityVault: true,
    providerBrandProfile: true,
  },
  embedded: {
    crossDocumentPrefill: true,
    transitionLedger: true,
    identityVault: true,
    providerBrandProfile: true,
  },
};
