import { assertPolicyAllowsMatching, type ErrorCode, type GeoPoint, type JurisdictionPolicy, type RouteSnapshot, type TimeWindow } from '@scoot/domain';
import type { InsertionResult, RouteProvider } from './router.js';

export type PassengerIntent = {
  id: string;
  origin: GeoPoint;
  destination: GeoPoint;
  window: TimeWindow;
  maxWalkM: number;
  seats: number;
  eligible: boolean;
};

export type DriverTrip = {
  id: string;
  driverId: string;
  vehicleEligible: boolean;
  driverEligible: boolean;
  publishedBeforeRequest: boolean;
  origin: GeoPoint;
  destination: GeoPoint;
  currentRoute: RouteSnapshot & { origin: GeoPoint; destination: GeoPoint };
  departureWindow: TimeWindow;
  availableSeats: number;
  maxDetourSeconds: number;
  driverReliability: number;
  arrangementsLast7Days: number;
};

export type MatchScoreParts = {
  routeOverlap: number;
  pickupConvenience: number;
  detourPenalty: number;
  scheduleFit: number;
  reliability: number;
};

export type MatchResult =
  | { eligible: true; score: number; parts: MatchScoreParts; insertion: InsertionResult; reasonCodes: [] }
  | { eligible: false; reasonCodes: ErrorCode[] };

function windowsIntersect(a: TimeWindow, b: TimeWindow): boolean {
  return a.startIso <= b.endIso && b.startIso <= a.endIso;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function rankFeasibleCandidate(parts: MatchScoreParts): number {
  return (
    0.35 * parts.routeOverlap +
    0.2 * parts.pickupConvenience +
    0.2 * parts.detourPenalty +
    0.15 * parts.scheduleFit +
    0.1 * parts.reliability
  );
}

export async function evaluateCandidate(
  passenger: PassengerIntent,
  trip: DriverTrip,
  policy: JurisdictionPolicy | null,
  atIso: string,
  router: RouteProvider,
): Promise<MatchResult> {
  const reasons: ErrorCode[] = [];
  const policyResult = assertPolicyAllowsMatching(policy, atIso);
  if (!policyResult.ok) reasons.push(policyResult.code);
  if (!passenger.eligible) reasons.push('USER_NOT_ELIGIBLE');
  if (!trip.driverEligible || !trip.vehicleEligible) reasons.push('DRIVER_OR_VEHICLE_INELIGIBLE');
  if (!trip.publishedBeforeRequest) reasons.push('DRIVER_ROUTE_NOT_PRESERVED');
  if (!windowsIntersect(passenger.window, trip.departureWindow)) reasons.push('TIME_MISMATCH');
  if (trip.availableSeats < passenger.seats) reasons.push('SEAT_UNAVAILABLE');
  if (
    policy?.driverArrangementLimit &&
    trip.arrangementsLast7Days >= policy.driverArrangementLimit.count
  ) {
    reasons.push('DRIVER_FREQUENCY_EXCEEDED');
  }

  if (reasons.length) return { eligible: false, reasonCodes: reasons };

  const insertion = await router.insertStops({
    originalRoute: trip.currentRoute,
    pickup: passenger.origin,
    dropoff: passenger.destination,
    preserveOrder: true,
  });

  const origin = insertion.stops.find((s) => s.type === 'ORIGIN');
  const dest = insertion.stops.find((s) => s.type === 'DESTINATION');
  if (
    !origin ||
    !dest ||
    origin.point.lat !== trip.origin.lat ||
    origin.point.lon !== trip.origin.lon ||
    dest.point.lat !== trip.destination.lat ||
    dest.point.lon !== trip.destination.lon
  ) {
    return { eligible: false, reasonCodes: ['DRIVER_ROUTE_NOT_PRESERVED'] };
  }

  const pickup = insertion.stops.find((s) => s.type === 'PICKUP');
  const dropoff = insertion.stops.find((s) => s.type === 'DROPOFF');
  if (!pickup || !dropoff || pickup.offsetM >= dropoff.offsetM) {
    return { eligible: false, reasonCodes: ['STOP_ORDER_INVALID'] };
  }
  if (insertion.extraDurationSeconds > trip.maxDetourSeconds) {
    return { eligible: false, reasonCodes: ['DETOUR_EXCEEDED'] };
  }
  if (insertion.pickupWalkMeters > passenger.maxWalkM) {
    return { eligible: false, reasonCodes: ['ROUTE_INCOMPATIBLE'] };
  }

  const parts: MatchScoreParts = {
    routeOverlap: clamp01(insertion.passengerRouteOverlap),
    pickupConvenience: clamp01(1 - insertion.pickupWalkMeters / Math.max(passenger.maxWalkM, 1)),
    detourPenalty: clamp01(1 - insertion.extraDurationSeconds / Math.max(trip.maxDetourSeconds, 1)),
    scheduleFit: 0.8,
    reliability: clamp01(trip.driverReliability),
  };
  return {
    eligible: true,
    score: rankFeasibleCandidate(parts),
    parts,
    insertion,
    reasonCodes: [],
  };
}
