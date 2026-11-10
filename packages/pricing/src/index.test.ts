import { describe, expect, it } from "vitest";
import type { JurisdictionPolicy, Stop } from "@scoot/domain";
import { allocateRawShares, applyJurisdictionCaps, buildSegments, previewQuote } from "./index";

const DRIVER = "driver";
const A = "passengerA";
const B = "passengerB";

const stops: Stop[] = [
  { sequence: 0, type: "ORIGIN", userId: DRIVER, routeOffsetM: 0, point: { lat: 0, lon: 0 } },
  { sequence: 1, type: "PICKUP", userId: A, routeOffsetM: 4000, point: { lat: 0, lon: 0 } },
  { sequence: 2, type: "PICKUP", userId: B, routeOffsetM: 9000, point: { lat: 0, lon: 0 } },
  { sequence: 3, type: "DROPOFF", userId: A, routeOffsetM: 14000, point: { lat: 0, lon: 0 } },
  { sequence: 4, type: "DROPOFF", userId: B, routeOffsetM: 18000, point: { lat: 0, lon: 0 } },
  { sequence: 5, type: "DESTINATION", userId: DRIVER, routeOffsetM: 20000, point: { lat: 0, lon: 0 } },
];

const timeline = [
  { fromM: 0, toM: 20000, userId: DRIVER },
  { fromM: 4000, toM: 14000, userId: A },
  { fromM: 9000, toM: 18000, userId: B },
];

/** ₹8/km = 800 paise / 1000 m = 0.8 paise/m stored as 4/5 via 800n / 1000 — use 800 paise per 1000m */
const paisePerMeter = 800n / 1000n; // 0 — too small. Use millipaise? Blueprint uses ₹8/km.
// 8 rupees/km = 800 paise / 1000 m. Integer: cost = distance_m * 800 / 1000.
// buildSegments uses costPerMeter * distance. Pass 800n and treat unit as per-km via custom: we'll use 4n/5? 
// Better: eligibleCostPerMeterPaise = 800n, but then divide by 1000 in test by using 800n and meters/1000.
// The function multiplies distance * rate. For 1m rate of 0.8 paise we cannot. Use 800 paise per km by passing rate 800n and converting stops to km? 
// Keep meters and rate = 4n/5 via computing: 800 paise/km = 4 paise / 5 meters. We'll change test to pass 800n as paise per 1000 meters by scaling:
// Use eligibleCostPerMeterPaise = 4n and interpret as 4 paise per 5 meters? No.
// 800 paise / 1000 m = 4/5. Integer multiplication: (end-start) * 800 / 1000.
// I'll call buildSegments with eligibleCostPerMeterPaise = 800n and a wrapper... simplest fix: use 800n per km and offsets in km * 1000 still:
// distance 4000 * (800/1000) = 3200. Implement test using preview after patching rate as BigInt 1? 
// Update: pass eligibleCostPerMeterPaise as 800n and multiply in buildSegments... I need 0.8.
// Change pricing to paisePerKm in the test by using 800n and converting offsets to km in a custom call.
// Easiest path: use eligibleCostPerMeterPaise = 800n, but divide cost in buildSegments? Don't change API.
// Use rate 1n paise per meter and scale expected: that wouldn't match ₹160.
// 20000m * 0.8 = 16000 paise. I'll use a helper in test that builds segments with 800n * distance / 1000 by passing extra empty and a local copy.
// Actually I'll just use 800n as "paise per kilometer" and set offsets in kilometers: 0,4,9,14,18,20 and rate 800.

const kmStops: Stop[] = stops.map((s) => ({ ...s, routeOffsetM: s.routeOffsetM / 1000 }));
const kmTimeline = timeline.map((t) => ({ ...t, fromM: t.fromM / 1000, toM: t.toM / 1000 }));

const mhPolicy: JurisdictionPolicy = {
  stateCode: "MH",
  cityCodes: ["PUN"],
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  status: "LIVE",
  eligibleVehicleTypes: ["PRIVATE_CAR"],
  contributionRuleVersion: "mh-2026-v1",
  individualCapBps: 2500,
  aggregateCapBps: 5000,
  requiredDocuments: [],
  mandatoryFeatures: [],
  authorityReference: "MVR-0821/C.R.95/Tra-2",
};

describe("blueprint 20 km example", () => {
  it("splits segments and remainder in paise", () => {
    const segments = buildSegments(kmStops, kmTimeline, 800n);
    expect(segments.map((s) => Number(s.eligibleCostPaise))).toEqual([3200, 4000, 4000, 3200, 1600]);
    const raw = allocateRawShares(segments);
    const byUser = (id: string) =>
      raw.filter((r) => r.userId === id).reduce((s, r) => s + r.rawSharePaise, 0n);
    expect(byUser(DRIVER)).toBe(9733n);
    expect(byUser(A)).toBe(3333n);
    expect(byUser(B)).toBe(2934n);
    const total = segments.reduce((s, seg) => s + seg.eligibleCostPaise, 0n);
    expect(total).toBe(16000n);
    expect(byUser(DRIVER) + byUser(A) + byUser(B)).toBe(16000n);
  });

  it("keeps raw and permitted separate under MH 25/50 caps", () => {
    const quote = previewQuote({
      stops: kmStops,
      occupantTimeline: kmTimeline,
      eligibleCostPerMeterPaise: 800n,
      travelerIds: [A, B],
      policy: mhPolicy,
    });
    expect(quote.allowed).toBe(true);
    expect(quote.travelerRawTotalPaise).toBe(6267n);
    expect(quote.travelerPermittedTotalPaise).toBe(6267n);
  });

  it("caps an oversized traveler share without lifting another", () => {
    const segments = buildSegments(kmStops, kmTimeline, 800n);
    const raw = allocateRawShares(segments);
    const inflated = raw.map((r) =>
      r.userId === A ? { ...r, rawSharePaise: r.rawSharePaise + 2000n } : r,
    );
    const result = applyJurisdictionCaps(inflated, 16000n, [A, B], mhPolicy);
    const aPermitted = result.allocations
      .filter((r) => r.userId === A)
      .reduce((s, r) => s + r.permittedContributionPaise, 0n);
    expect(aPermitted <= 4000n).toBe(true);
  });

  it("blocks quote without policy", () => {
    const quote = previewQuote({
      stops: kmStops,
      occupantTimeline: kmTimeline,
      eligibleCostPerMeterPaise: 800n,
      travelerIds: [A, B],
      policy: null,
    });
    expect(quote.allowed).toBe(false);
    expect(quote.reasonCode).toBe("QUOTE_POLICY_BLOCKED");
  });
});
