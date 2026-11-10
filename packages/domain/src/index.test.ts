import { describe, expect, it } from "vitest";
import {
  assertTripTransition,
  canPublishTrip,
  policyAllowsMatching,
  type JurisdictionPolicy,
} from "./index";

const livePolicy = (): JurisdictionPolicy => ({
  stateCode: "MH",
  cityCodes: ["PUN"],
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  status: "LIVE",
  eligibleVehicleTypes: ["PRIVATE_CAR"],
  contributionRuleVersion: "mh-2026-v1",
  individualCapBps: 2500,
  aggregateCapBps: 5000,
  requiredDocuments: ["DL", "RC", "INSURANCE"],
  mandatoryFeatures: ["OTP", "SOS"],
  authorityReference: "MVR-0821/C.R.95/Tra-2",
});

describe("jurisdiction policy", () => {
  it("fails closed when policy is missing", () => {
    expect(policyAllowsMatching(null, "2026-11-10T00:00:00.000Z")).toBe(false);
  });

  it("fails closed when LIVE has no authority reference", () => {
    const policy = { ...livePolicy(), authorityReference: undefined };
    expect(policyAllowsMatching(policy, "2026-11-10T00:00:00.000Z")).toBe(false);
  });

  it("blocks DIRECTORY_ONLY and SUSPENDED", () => {
    expect(
      policyAllowsMatching({ ...livePolicy(), status: "DIRECTORY_ONLY" }, "2026-11-10T00:00:00.000Z"),
    ).toBe(false);
    expect(
      policyAllowsMatching({ ...livePolicy(), status: "SUSPENDED" }, "2026-11-10T00:00:00.000Z"),
    ).toBe(false);
  });
});

describe("trip transitions", () => {
  it("allows published to confirmed, then active", () => {
    expect(() => assertTripTransition("PUBLISHED", "CONFIRMED")).not.toThrow();
    expect(() => assertTripTransition("CONFIRMED", "ACTIVE")).not.toThrow();
  });

  it("rejects completed to active", () => {
    expect(() => assertTripTransition("COMPLETED", "ACTIVE")).toThrow(/INVALID_STATE_TRANSITION/);
  });
});

describe("publish gate", () => {
  it("requires verified private vehicle and live policy", () => {
    expect(
      canPublishTrip({
        driverVerified: true,
        vehicleValid: true,
        vehicleNonTransport: true,
        policy: livePolicy(),
        atIso: "2026-11-10T00:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      canPublishTrip({
        driverVerified: true,
        vehicleValid: true,
        vehicleNonTransport: false,
        policy: livePolicy(),
        atIso: "2026-11-10T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
