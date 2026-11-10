import {
  policyAllowsMatching,
  type ApiErrorCode,
  type GeoPoint,
  type JurisdictionPolicy,
  type RouteSnapshot,
} from "@scoot/domain";
import type { MapsProvider } from "./maps";

export { StubMapsProvider } from "./maps";
export type { InsertionResult, MapsProvider } from "./maps";

export type TimeWindow = { startIso: string; endIso: string };

export type PassengerIntent = {
  id: string;
  origin: GeoPoint;
  destination: GeoPoint;
  window: TimeWindow;
  maxWalkM: number;
  seats: number;
  verified: boolean;
};

export type DriverTrip = {
  id: string;
  driverId: string;
  origin: GeoPoint;
  destination: GeoPoint;
  departureWindow: TimeWindow;
  currentRoute: RouteSnapshot;
  maxDetourSeconds: number;
  availableSeats: number;
  driverVerified: boolean;
  vehicleEligible: boolean;
  publishedBeforeRequest: boolean;
  driverReliability: number;
};

export type MatchResult = {
  eligible: boolean;
  score: number;
  scoreParts: {
    routeOverlap: number;
    pickupWalk: number;
    detour: number;
    scheduleFit: number;
    reliability: number;
  };
  reasonCodes: ApiErrorCode[];
  tripId: string;
};

export function windowsIntersect(a: TimeWindow, b: TimeWindow, slackMs = 0): boolean {
  const aStart = Date.parse(a.startIso) - slackMs;
  const aEnd = Date.parse(a.endIso) + slackMs;
  const bStart = Date.parse(b.startIso);
  const bEnd = Date.parse(b.endIso);
  return aStart <= bEnd && bStart <= aEnd;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function rankFeasibleCandidate(parts: {
  routeOverlap: number;
  pickupWalkMeters: number;
  detourSeconds: number;
  waitSeconds: number;
  reliability: number;
}): MatchResult["scoreParts"] & { score: number } {
  const pickupWalk = clamp01(1 - parts.pickupWalkMeters / 800);
  const detour = clamp01(1 - parts.detourSeconds / 900);
  const scheduleFit = clamp01(1 - parts.waitSeconds / 900);
  const routeOverlap = clamp01(parts.routeOverlap);
  const reliability = clamp01(parts.reliability);
  const score =
    0.35 * routeOverlap + 0.2 * pickupWalk + 0.2 * detour + 0.15 * scheduleFit + 0.1 * reliability;
  return { routeOverlap, pickupWalk, detour, scheduleFit, reliability, score };
}

export async function evaluateCandidate(
  passenger: PassengerIntent,
  trip: DriverTrip,
  policy: JurisdictionPolicy | null,
  maps: MapsProvider,
  atIso: string,
): Promise<MatchResult> {
  const reasons: ApiErrorCode[] = [];
  if (!policyAllowsMatching(policy, atIso)) reasons.push("JURISDICTION_DISABLED");
  if (!passenger.verified || !trip.driverVerified || !trip.vehicleEligible) {
    reasons.push("USER_NOT_ELIGIBLE");
    reasons.push("DRIVER_OR_VEHICLE_INELIGIBLE");
  }
  if (!trip.publishedBeforeRequest) reasons.push("DRIVER_ROUTE_NOT_PRESERVED");
  if (!windowsIntersect(passenger.window, trip.departureWindow)) reasons.push("TIME_MISMATCH");
  if (trip.availableSeats < passenger.seats) reasons.push("SEAT_UNAVAILABLE");

  if (reasons.length > 0) {
    return { eligible: false, score: 0, scoreParts: emptyParts(), reasonCodes: reasons, tripId: trip.id };
  }

  const insertion = await maps.insertStops({
    originalRoute: { ...trip.currentRoute, origin: trip.origin, destination: trip.destination },
    pickup: passenger.origin,
    dropoff: passenger.destination,
    preserveOrder: true,
  });

  if (!insertion.preservesDriverJourney) reasons.push("DRIVER_ROUTE_NOT_PRESERVED");
  const pickupIdx = insertion.stops.findIndex((s) => s.type === "PICKUP");
  const dropIdx = insertion.stops.findIndex((s) => s.type === "DROPOFF");
  if (pickupIdx < 0 || dropIdx < 0 || pickupIdx >= dropIdx) reasons.push("STOP_ORDER_INVALID");
  if (insertion.extraDurationSeconds > trip.maxDetourSeconds) reasons.push("DETOUR_EXCEEDED");
  if (insertion.pickupWalkMeters > passenger.maxWalkM) reasons.push("ROUTE_INCOMPATIBLE");

  if (reasons.length > 0) {
    return { eligible: false, score: 0, scoreParts: emptyParts(), reasonCodes: reasons, tripId: trip.id };
  }

  const ranked = rankFeasibleCandidate({
    routeOverlap: insertion.passengerRouteOverlap,
    pickupWalkMeters: insertion.pickupWalkMeters,
    detourSeconds: insertion.extraDurationSeconds,
    waitSeconds: insertion.expectedWaitSeconds,
    reliability: trip.driverReliability,
  });

  return {
    eligible: true,
    score: ranked.score,
    scoreParts: {
      routeOverlap: ranked.routeOverlap,
      pickupWalk: ranked.pickupWalk,
      detour: ranked.detour,
      scheduleFit: ranked.scheduleFit,
      reliability: ranked.reliability,
    },
    reasonCodes: [],
    tripId: trip.id,
  };
}

function emptyParts(): MatchResult["scoreParts"] {
  return { routeOverlap: 0, pickupWalk: 0, detour: 0, scheduleFit: 0, reliability: 0 };
}
