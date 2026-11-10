import { describe, expect, it } from 'vitest';
import { previewQuote } from './quote.js';
import type { Stop } from '@scoot/domain';

describe('blueprint 20 km worked example', () => {
  const driverId = 'driver';
  const stops: Stop[] = [
    { sequence: 1, type: 'PICKUP', userId: 'A', routeOffsetM: 4000, point: { lat: 0, lon: 0 } },
    { sequence: 2, type: 'PICKUP', userId: 'B', routeOffsetM: 9000, point: { lat: 0, lon: 0 } },
    { sequence: 3, type: 'DROPOFF', userId: 'A', routeOffsetM: 14000, point: { lat: 0, lon: 0 } },
    { sequence: 4, type: 'DROPOFF', userId: 'B', routeOffsetM: 18000, point: { lat: 0, lon: 0 } },
  ];

  it('splits ₹8/km over 20 km into reconciling paise shares', () => {
    const quote = previewQuote({
      driverId,
      routeDistanceM: 20000,
      stops,
      paisePerKm: 800n,
      policy: { version: 'test-v1', driverId },
    });

    const byUser = Object.fromEntries(
      quote.allocations.map((a) => [a.userId, Number(a.rawSharePaise)]),
    );
    expect(quote.totalEligibleCostPaise).toBe(16000n);
    expect(byUser.driver).toBe(9733);
    expect(byUser.A).toBe(3333);
    expect(byUser.B).toBe(2934);
  });

  it('stores raw and permitted separately when caps apply', () => {
    const quote = previewQuote({
      driverId,
      routeDistanceM: 20000,
      stops,
      paisePerKm: 800n,
      policy: {
        version: 'mh-2026-v1',
        driverId,
        individualCapBps: 2500,
        aggregateCapBps: 5000,
      },
    });
    const a = quote.allocations.find((x) => x.userId === 'A')!;
    const b = quote.allocations.find((x) => x.userId === 'B')!;
    expect(a.rawSharePaise).toBe(3333n);
    expect(b.rawSharePaise).toBe(2934n);
    expect(a.permittedContributionPaise).toBeLessThanOrEqual(4000n);
    expect(a.permittedContributionPaise + b.permittedContributionPaise).toBeLessThanOrEqual(8000n);
  });
});
