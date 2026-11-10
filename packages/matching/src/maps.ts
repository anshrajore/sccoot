import type { GeoPoint, RouteSnapshot } from "@scoot/domain";

export type InsertStopsInput = {
  originalRoute: RouteSnapshot & { origin: GeoPoint; destination: GeoPoint };
  pickup: GeoPoint;
  dropoff: GeoPoint;
  preserveOrder: boolean;
};

export type InsertionResult = {
  stops: Array<{ type: "ORIGIN" | "PICKUP" | "DROPOFF" | "DESTINATION"; point: GeoPoint; offsetM: number }>;
  distanceM: number;
  durationS: number;
  extraDurationSeconds: number;
  extraDistanceM: number;
  pickupWalkMeters: number;
  expectedWaitSeconds: number;
  passengerRouteOverlap: number;
  preservesDriverJourney: boolean;
};

export interface MapsProvider {
  insertStops(input: InsertStopsInput): Promise<InsertionResult>;
}

/** Fixture router: linear interpolation along a fake corridor. No vendor SDK types. */
export class StubMapsProvider implements MapsProvider {
  async insertStops(input: InsertStopsInput): Promise<InsertionResult> {
    const origin = input.originalRoute.origin;
    const dest = input.originalRoute.destination;
    const pickupOffset = 0.25;
    const dropOffset = 0.75;
    const base = input.originalRoute.distanceM;
    const extra = Math.round(base * 0.08);
    return {
      stops: [
        { type: "ORIGIN", point: origin, offsetM: 0 },
        { type: "PICKUP", point: input.pickup, offsetM: Math.round(base * pickupOffset) },
        { type: "DROPOFF", point: input.dropoff, offsetM: Math.round(base * dropOffset) },
        { type: "DESTINATION", point: dest, offsetM: base + extra },
      ],
      distanceM: base + extra,
      durationS: input.originalRoute.durationS + 240,
      extraDurationSeconds: 240,
      extraDistanceM: extra,
      pickupWalkMeters: 180,
      expectedWaitSeconds: 120,
      passengerRouteOverlap: 0.72,
      preservesDriverJourney:
        origin.lat === input.originalRoute.origin.lat &&
        dest.lat === input.originalRoute.destination.lat,
    };
  }
}
