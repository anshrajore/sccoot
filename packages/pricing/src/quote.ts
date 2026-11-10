import { createHash } from 'node:crypto';
import type { Segment, Stop } from '@scoot/domain';
import { allocateRawShares, applyCaps, reconcilePaise, type CapPolicy } from './allocate.js';
import { buildSegments, linearDistanceCost, occupantsFromBoardingOrder } from './segments.js';

export function hashQuoteInputs(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function previewQuote(input: {
  driverId: string;
  routeDistanceM: number;
  stops: Stop[];
  paisePerKm: bigint;
  policy: CapPolicy;
}) {
  const segments: Segment[] = buildSegments(
    input.stops,
    input.routeDistanceM,
    (start, end) => occupantsFromBoardingOrder(input.driverId, input.stops, start, end),
    (start, end) => linearDistanceCost(input.paisePerKm, start, end),
  );
  const raw = allocateRawShares(segments);
  const total = reconcilePaise(segments, raw);
  const allocations = applyCaps(raw, total, input.policy);
  return {
    segments,
    allocations,
    totalEligibleCostPaise: total,
    quoteHash: hashQuoteInputs({
      routeDistanceM: input.routeDistanceM,
      stops: input.stops,
      paisePerKm: input.paisePerKm.toString(),
      policyVersion: input.policy.version,
      allocations: allocations.map((a) => ({
        userId: a.userId,
        raw: a.rawSharePaise.toString(),
        permitted: a.permittedContributionPaise.toString(),
      })),
    }),
  };
}
