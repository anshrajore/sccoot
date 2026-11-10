import type { Segment, Stop } from '@scoot/domain';

export function buildSegments(
  stops: Stop[],
  routeDistanceM: number,
  occupantsAt: (startM: number, endM: number) => string[],
  eligibleCostFor: (startM: number, endM: number) => bigint,
): Segment[] {
  const boundaries = new Set<number>([0, routeDistanceM]);
  for (const stop of stops) {
    if (stop.routeOffsetM < 0 || stop.routeOffsetM > routeDistanceM) {
      throw new Error('STOP_OFFSET_OUT_OF_RANGE');
    }
    boundaries.add(stop.routeOffsetM);
  }
  const sorted = [...boundaries].sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const startM = sorted[i]!;
    const endM = sorted[i + 1]!;
    if (startM === endM) continue;
    segments.push({
      startM,
      endM,
      occupantIds: occupantsAt(startM, endM),
      eligibleCostPaise: eligibleCostFor(startM, endM),
    });
  }
  assertNoGapOrOverlap(segments, routeDistanceM);
  return segments;
}

export function occupantsFromBoardingOrder(
  driverId: string,
  stops: Stop[],
  startM: number,
  endM: number,
): string[] {
  const aboard = new Set<string>([driverId]);
  const ordered = [...stops].sort((a, b) => a.routeOffsetM - b.routeOffsetM);
  for (const stop of ordered) {
    if (stop.routeOffsetM <= startM) {
      if (stop.type === 'PICKUP') aboard.add(stop.userId);
      if (stop.type === 'DROPOFF') aboard.delete(stop.userId);
    }
  }
  void endM;
  return [...aboard];
}

function assertNoGapOrOverlap(segments: Segment[], routeDistanceM: number): void {
  if (segments.length === 0) {
    throw new Error('NO_SEGMENTS');
  }
  if (segments[0]!.startM !== 0) throw new Error('SEGMENT_GAP');
  if (segments[segments.length - 1]!.endM !== routeDistanceM) throw new Error('SEGMENT_GAP');
  for (let i = 1; i < segments.length; i += 1) {
    if (segments[i]!.startM !== segments[i - 1]!.endM) throw new Error('SEGMENT_GAP');
  }
}

export function linearDistanceCost(
  paisePerKm: bigint,
  startM: number,
  endM: number,
): bigint {
  return (paisePerKm * BigInt(endM - startM)) / 1000n;
}
