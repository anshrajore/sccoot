import { describe, expect, it } from "vitest";
import type { JurisdictionPolicy } from "@scoot/domain";
import { StubMapsProvider, evaluateCandidate, windowsIntersect } from "./index";
import type { DriverTrip, PassengerIntent } from "./index";

const policy: JurisdictionPolicy = {
  stateCode: "MH",
  cityCodes: ["PUN"],
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  status: "LIVE",
  eligibleVehicleTypes: ["PRIVATE_CAR"],
  contributionRuleVersion: "mh-2026-v1",
  requiredDocuments: [],
  mandatoryFeatures: [],
  authorityReference: "ok",
};

const passenger: PassengerIntent = {
  id: "p1",
  origin: { lat: 18.52, lon: 73.85 },
  destination: { lat: 18.56, lon: 73.8 },
  window: { startIso: "2026-11-10T07:30:00.000Z", endIso: "2026-11-10T08:15:00.000Z" },
  maxWalkM: 400,
  seats: 1,
  verified: true,
};

const trip: DriverTrip = {
  id: "t1",
  driverId: "d1",
  origin: { lat: 18.5, lon: 73.9 },
  destination: { lat: 18.58, lon: 73.78 },
  departureWindow: { startIso: "2026-11-10T07:40:00.000Z", endIso: "2026-11-10T08:10:00.000Z" },
  currentRoute: {
    routeVersionId: "rv1",
    distanceM: 12000,
    durationS: 1800,
    geometryRef: "stub",
    provider: "stub",
  },
  maxDetourSeconds: 600,
  availableSeats: 2,
  driverVerified: true,
  vehicleEligible: true,
  publishedBeforeRequest: true,
  driverReliability: 0.8,
};

describe("time windows", () => {
  it("intersects overlapping windows", () => {
    expect(windowsIntersect(passenger.window, trip.departureWindow)).toBe(true);
  });
  it("rejects disjoint windows", () => {
    expect(
      windowsIntersect(passenger.window, {
        startIso: "2026-11-10T10:00:00.000Z",
        endIso: "2026-11-10T11:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("evaluateCandidate", () => {
  const maps = new StubMapsProvider();
  const at = "2026-11-10T00:00:00.000Z";

  it("ranks only after hard filters pass", async () => {
    const result = await evaluateCandidate(passenger, trip, policy, maps, at);
    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasonCodes).toEqual([]);
  });

  it("does not rank ineligible candidates", async () => {
    const result = await evaluateCandidate(
      passenger,
      { ...trip, availableSeats: 0 },
      policy,
      maps,
      at,
    );
    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasonCodes).toContain("SEAT_UNAVAILABLE");
  });

  it("fails closed on suspended policy", async () => {
    const result = await evaluateCandidate(
      passenger,
      trip,
      { ...policy, status: "SUSPENDED" },
      maps,
      at,
    );
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain("JURISDICTION_DISABLED");
  });
});
