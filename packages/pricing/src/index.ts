import type { JurisdictionPolicy, Stop } from "@scoot/domain";

export type JourneySegment = {
  sequence: number;
  startM: number;
  endM: number;
  occupantIds: string[];
  eligibleCostPaise: bigint;
};

export type CostAllocation = {
  segmentSequence: number;
  userId: string;
  rawSharePaise: bigint;
  permittedContributionPaise: bigint;
  capApplied: boolean;
  remainderPaise: bigint;
};

export type QuotePreview = {
  totalEligibleCostPaise: bigint;
  segments: JourneySegment[];
  allocations: CostAllocation[];
  travelerRawTotalPaise: bigint;
  travelerPermittedTotalPaise: bigint;
  policyVersion: string;
  allowed: boolean;
  reasonCode?: string;
};

export function buildSegments(
  stops: Stop[],
  occupantTimeline: Array<{ fromM: number; toM: number; userId: string }>,
  eligibleCostPerMeterPaise: bigint,
  extraPaiseByRange: Array<{ fromM: number; toM: number; paise: bigint }> = [],
): JourneySegment[] {
  const bounds = Array.from(new Set(stops.map((s) => s.routeOffsetM))).sort((a, b) => a - b);
  if (bounds.length < 2) {
    throw new Error("Need at least origin and destination offsets");
  }
  const segments: JourneySegment[] = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const startM = bounds[i]!;
    const endM = bounds[i + 1]!;
    if (endM <= startM) throw new Error("Overlapping or inverted segment");
    const occupantIds = occupantTimeline
      .filter((o) => o.fromM <= startM && o.toM >= endM)
      .map((o) => o.userId);
    if (occupantIds.length === 0) {
      throw new Error("Segment missing occupants");
    }
    const distance = BigInt(endM - startM);
    let eligible = distance * eligibleCostPerMeterPaise;
    for (const extra of extraPaiseByRange) {
      if (extra.fromM <= startM && extra.toM >= endM) {
        const span = BigInt(extra.toM - extra.fromM);
        eligible += span === 0n ? extra.paise : (extra.paise * distance) / span;
      }
    }
    segments.push({ sequence: i, startM, endM, occupantIds, eligibleCostPaise: eligible });
  }
  return segments;
}

function allocateRemainder(total: bigint, parts: bigint[]): bigint[] {
  const sum = parts.reduce((a, b) => a + b, 0n);
  let leftover = total - sum;
  const out = [...parts];
  let i = out.length - 1;
  while (leftover > 0n && i >= 0) {
    out[i] = out[i]! + 1n;
    leftover -= 1n;
    i -= 1;
  }
  return out;
}

export function allocateRawShares(segments: JourneySegment[]): CostAllocation[] {
  const rows: CostAllocation[] = [];
  for (const segment of segments) {
    const n = BigInt(segment.occupantIds.length);
    const base = segment.eligibleCostPaise / n;
    const floors = segment.occupantIds.map(() => base);
    const withRemainder = allocateRemainder(segment.eligibleCostPaise, floors);
    segment.occupantIds.forEach((userId, idx) => {
      const raw = withRemainder[idx]!;
      rows.push({
        segmentSequence: segment.sequence,
        userId,
        rawSharePaise: raw,
        permittedContributionPaise: raw,
        capApplied: false,
        remainderPaise: raw - base,
      });
    });
  }
  return rows;
}

export function applyJurisdictionCaps(
  allocations: CostAllocation[],
  totalEligibleCostPaise: bigint,
  travelerIds: string[],
  policy: JurisdictionPolicy | null,
): { allocations: CostAllocation[]; allowed: boolean; reasonCode?: string } {
  if (!policy) {
    return { allocations, allowed: false, reasonCode: "QUOTE_POLICY_BLOCKED" };
  }
  if (policy.status !== "LIVE" && policy.status !== "APPROVED_PILOT") {
    return { allocations, allowed: false, reasonCode: "JURISDICTION_DISABLED" };
  }
  const individualCap =
    policy.individualCapBps == null
      ? null
      : (totalEligibleCostPaise * BigInt(policy.individualCapBps)) / 10000n;
  const aggregateCap =
    policy.aggregateCapBps == null
      ? null
      : (totalEligibleCostPaise * BigInt(policy.aggregateCapBps)) / 10000n;

  const travelerRaw: Record<string, bigint> = {};
  for (const id of travelerIds) travelerRaw[id] = 0n;
  for (const row of allocations) {
    if (idIsTraveler(row.userId, travelerIds)) {
      travelerRaw[row.userId] = (travelerRaw[row.userId] ?? 0n) + row.rawSharePaise;
    }
  }

  const permittedTotals: Record<string, bigint> = {};
  let aggregate = 0n;
  for (const id of travelerIds) {
    let permitted = travelerRaw[id] ?? 0n;
    if (individualCap != null && permitted > individualCap) permitted = individualCap;
    permittedTotals[id] = permitted;
    aggregate += permitted;
  }
  if (aggregateCap != null && aggregate > aggregateCap) {
    // Scale down proportionally without lifting another traveler over individual cap.
    for (const id of travelerIds) {
      const current = permittedTotals[id] ?? 0n;
      permittedTotals[id] = aggregate === 0n ? 0n : (current * aggregateCap) / aggregate;
    }
  }

  const next = allocations.map((row) => {
    if (!idIsTraveler(row.userId, travelerIds)) return row;
    const target = permittedTotals[row.userId] ?? 0n;
    const rawTotal = travelerRaw[row.userId] ?? 0n;
    const scaled = rawTotal === 0n ? 0n : (row.rawSharePaise * target) / rawTotal;
    return {
      ...row,
      permittedContributionPaise: scaled,
      capApplied: scaled !== row.rawSharePaise,
    };
  });

  return { allocations: next, allowed: true };
}

function idIsTraveler(userId: string, travelerIds: string[]): boolean {
  return travelerIds.includes(userId);
}

export function previewQuote(input: {
  stops: Stop[];
  occupantTimeline: Array<{ fromM: number; toM: number; userId: string }>;
  eligibleCostPerMeterPaise: bigint;
  travelerIds: string[];
  policy: JurisdictionPolicy | null;
}): QuotePreview {
  const segments = buildSegments(input.stops, input.occupantTimeline, input.eligibleCostPerMeterPaise);
  const total = segments.reduce((sum, s) => sum + s.eligibleCostPaise, 0n);
  const raw = allocateRawShares(segments);
  const capped = applyJurisdictionCaps(raw, total, input.travelerIds, input.policy);
  const travelerRawTotal = raw
    .filter((a) => input.travelerIds.includes(a.userId))
    .reduce((s, a) => s + a.rawSharePaise, 0n);
  const travelerPermittedTotal = capped.allocations
    .filter((a) => input.travelerIds.includes(a.userId))
    .reduce((s, a) => s + a.permittedContributionPaise, 0n);
  return {
    totalEligibleCostPaise: total,
    segments,
    allocations: capped.allocations,
    travelerRawTotalPaise: travelerRawTotal,
    travelerPermittedTotalPaise: travelerPermittedTotal,
    policyVersion: input.policy?.contributionRuleVersion ?? "missing",
    allowed: capped.allowed,
    reasonCode: capped.reasonCode,
  };
}

export function hashQuoteInputs(parts: {
  routeVersionId: string;
  occupancy: string;
  policyVersion: string;
  totalEligibleCostPaise: bigint;
}): string {
  const payload = `${parts.routeVersionId}|${parts.occupancy}|${parts.policyVersion}|${parts.totalEligibleCostPaise.toString()}`;
  let h = 0;
  for (let i = 0; i < payload.length; i += 1) {
    h = (h * 31 + payload.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
