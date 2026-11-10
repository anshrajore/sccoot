import type { Allocation, Segment } from '@scoot/domain';

/**
 * Equal occupant split in integer paise.
 * Remainder paise are given one-at-a-time from the last occupant toward the first
 * (boarding order, driver first) so totals always reconcile.
 */
export function allocateRawShares(segments: Segment[]): Map<string, bigint> {
  const totals = new Map<string, bigint>();
  for (const segment of segments) {
    const n = segment.occupantIds.length;
    if (n === 0) throw new Error('EMPTY_OCCUPANCY');
    const base = segment.eligibleCostPaise / BigInt(n);
    let remainder = segment.eligibleCostPaise % BigInt(n);
    for (let i = 0; i < n; i += 1) {
      const userId = segment.occupantIds[i]!;
      let share = base;
      if (i === n - 1) {
        share += remainder;
        remainder = 0n;
      }
      totals.set(userId, (totals.get(userId) ?? 0n) + share);
    }
  }
  return totals;
}

export function reconcilePaise(segments: Segment[], shares: Map<string, bigint>): bigint {
  const segmentTotal = segments.reduce((acc, s) => acc + s.eligibleCostPaise, 0n);
  const shareTotal = [...shares.values()].reduce((acc, v) => acc + v, 0n);
  if (segmentTotal !== shareTotal) {
    throw new Error('ALLOCATION_DOES_NOT_RECONCILE');
  }
  return segmentTotal;
}

export type CapPolicy = {
  version: string;
  individualCapBps?: number;
  aggregateCapBps?: number;
  driverId: string;
};

export function applyCaps(
  rawShares: Map<string, bigint>,
  totalEligiblePaise: bigint,
  policy: CapPolicy,
): Allocation[] {
  if (!policy.version) {
    throw new Error('QUOTE_POLICY_BLOCKED');
  }
  const travelerIds = [...rawShares.keys()].filter((id) => id !== policy.driverId);
  const allocations: Allocation[] = [];

  const individualCap =
    policy.individualCapBps === undefined
      ? undefined
      : (totalEligiblePaise * BigInt(policy.individualCapBps)) / 10000n;
  const aggregateCap =
    policy.aggregateCapBps === undefined
      ? undefined
      : (totalEligiblePaise * BigInt(policy.aggregateCapBps)) / 10000n;

  let travelerPermittedSum = 0n;
  const permittedByUser = new Map<string, bigint>();
  for (const userId of travelerIds) {
    let permitted = rawShares.get(userId) ?? 0n;
    let capApplied = false;
    if (individualCap !== undefined && permitted > individualCap) {
      permitted = individualCap;
      capApplied = true;
    }
    permittedByUser.set(userId, permitted);
    travelerPermittedSum += permitted;
    allocations.push({
      userId,
      rawSharePaise: rawShares.get(userId) ?? 0n,
      permittedContributionPaise: permitted,
      policyVersion: policy.version,
      capApplied,
    });
  }

  if (aggregateCap !== undefined && travelerPermittedSum > aggregateCap) {
    let remainingCap = aggregateCap;
    for (const alloc of allocations) {
      const next = alloc.permittedContributionPaise < remainingCap
        ? alloc.permittedContributionPaise
        : remainingCap;
      if (next !== alloc.permittedContributionPaise) alloc.capApplied = true;
      alloc.permittedContributionPaise = next;
      remainingCap -= next;
    }
  }

  const driverRaw = rawShares.get(policy.driverId) ?? 0n;
  allocations.push({
    userId: policy.driverId,
    rawSharePaise: driverRaw,
    permittedContributionPaise: 0n,
    policyVersion: policy.version,
    capApplied: false,
  });

  return allocations;
}
