export * from "./types.js";
export * from "./policy.js";
export * from "./state-machines.js";

import type { JurisdictionPolicy } from "./types.js";
import { assertPolicyAllowsMatching } from "./policy.js";
import { canTransitionTrip, type TripState } from "./state-machines.js";

export type ApiErrorCode = import("./types.js").ErrorCode;

export function policyAllowsMatching(policy: JurisdictionPolicy | null, atIso: string): boolean {
  return assertPolicyAllowsMatching(policy, atIso).ok;
}

export function canPublishTrip(input: {
  driverVerified: boolean;
  vehicleValid: boolean;
  vehicleNonTransport: boolean;
  policy: JurisdictionPolicy | null;
  atIso: string;
}): boolean {
  if (!input.driverVerified || !input.vehicleValid || !input.vehicleNonTransport) return false;
  return policyAllowsMatching(input.policy, input.atIso);
}

export function assertTripTransition(from: TripState, to: TripState): void {
  if (!canTransitionTrip(from, to)) {
    throw Object.assign(new Error("INVALID_STATE_TRANSITION"), {
      code: "INVALID_STATE_TRANSITION",
      from,
      to,
    });
  }
}

export const CURRENCY_INR = "INR" as const;
export const TIMEZONE_ASIA_KOLKATA = "Asia/Kolkata" as const;
