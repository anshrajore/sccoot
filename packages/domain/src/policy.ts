import type { JurisdictionPolicy } from './types.js';

export function isPolicyLiveForMatching(policy: JurisdictionPolicy | null, atIso: string): boolean {
  if (!policy) return false;
  if (policy.status !== "APPROVED_PILOT" && policy.status !== "LIVE") return false;
  if (policy.effectiveFrom > atIso) return false;
  if (policy.effectiveTo && policy.effectiveTo < atIso) return false;
  return true;
}

export function assertPolicyAllowsMatching(
  policy: JurisdictionPolicy | null,
  atIso: string,
): { ok: true } | { ok: false; code: "JURISDICTION_DISABLED" } {
  if (!isPolicyLiveForMatching(policy, atIso)) {
    return { ok: false, code: "JURISDICTION_DISABLED" };
  }
  if (!policy?.authorityReference) {
    return { ok: false, code: "JURISDICTION_DISABLED" };
  }
  return { ok: true };
}
