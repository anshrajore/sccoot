import type { GeoPoint, RouteSnapshot } from '@scoot/domain';

export type InsertStopsInput = {
  originalRoute: RouteSnapshot & { origin: GeoPoint; destination: GeoPoint };
  pickup: GeoPoint;
  dropoff: GeoPoint;
  preserveOrder: boolean;
};

export type InsertionResult = {
  stops: Array<{ type: 'ORIGIN' | 'PICKUP' | 'DROPOFF' | 'DESTINATION'; point: GeoPoint; offsetM: number }>;
  distanceM: number;
  durationS: number;
  extraDurationSeconds: number;
  extraDistanceM: number;
  pickupWalkMeters: number;
  expectedWaitSeconds: number;
  passengerRouteOverlap: number;
  provider: string;
};

export interface RouteProvider {
  insertStops(input: InsertStopsInput): Promise<InsertionResult>;
}

function haversineM(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Fixture router: interpolates along a straight corridor. Not for production matching. */
export class StubRouteProvider implements RouteProvider {
  async insertStops(input: InsertStopsInput): Promise<InsertionResult> {
    const { origin, destination } = input.originalRoute;
    const baseM = Math.max(1, haversineM(origin, destination));
    const pickupOffset = Math.min(baseM * 0.25, haversineM(origin, input.pickup));
    const dropOffset = Math.max(pickupOffset + 100, baseM - haversineM(input.dropoff, destination));
    const extraDistanceM = Math.round(haversineM(input.pickup, origin) * 0.1);
    const distanceM = Math.round(baseM + extraDistanceM);
    return {
      stops: [
        { type: 'ORIGIN', point: origin, offsetM: 0 },
        { type: 'PICKUP', point: input.pickup, offsetM: Math.round(pickupOffset) },
        { type: 'DROPOFF', point: input.dropoff, offsetM: Math.round(dropOffset) },
        { type: 'DESTINATION', point: destination, offsetM: distanceM },
      ],
      distanceM,
      durationS: Math.round(distanceM / 8),
      extraDurationSeconds: Math.round(extraDistanceM / 8),
      extraDistanceM,
      pickupWalkMeters: 80,
      expectedWaitSeconds: 120,
      passengerRouteOverlap: 0.82,
      provider: 'stub',
    };
  }
}
