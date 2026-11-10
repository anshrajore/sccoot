import { describe, expect, it } from 'vitest';
import type { JurisdictionPolicy } from '@scoot/domain';
import { evaluateCandidate, type DriverTrip, type PassengerIntent } from './evaluate.js';
import { StubRouteProvider } from './router.js';

const policy: JurisdictionPolicy = {
  stateCode: 'MH',
  cityCodes: ['PUNE'],
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  status: 'LIVE',
  eligibleVehicleTypes: ['PRIVATE_CAR'],
  contributionRuleVersion: 'mh-2026-v1',
  requiredDocuments: [],
  mandatoryFeatures: [],
  driverArrangementLimit: { count: 4, rollingDays: 7 },
  authorityReference: 'MVR-0821/C.R.95/Tra-2',
};

const passenger: PassengerIntent = {
  id: 'p1',
  origin: { lat: 18.52, lon: 73.85 },
  destination: { lat: 18.55, lon: 73.87 },
  window: { startIso: '2026-11-11T07:00:00.000Z', endIso: '2026-11-11T08:00:00.000Z' },
  maxWalkM: 400,
  seats: 1,
  eligible: true,
};

const trip: DriverTrip = {
  id: 't1',
  driverId: 'd1',
  vehicleEligible: true,
  driverEligible: true,
  publishedBeforeRequest: true,
  origin: { lat: 18.5, lon: 73.84 },
  destination: { lat: 18.56, lon: 73.88 },
  currentRoute: {
    routeVersionId: 'rv1',
    distanceM: 9000,
    durationS: 1200,
    geometryRef: 'stub',
    provider: 'stub',
    origin: { lat: 18.5, lon: 73.84 },
    destination: { lat: 18.56, lon: 73.88 },
  },
  departureWindow: { startIso: '2026-11-11T07:15:00.000Z', endIso: '2026-11-11T07:45:00.000Z' },
  availableSeats: 2,
  maxDetourSeconds: 900,
  driverReliability: 0.9,
  arrangementsLast7Days: 1,
};

describe('evaluateCandidate', () => {
  const router = new StubRouteProvider();

  it('ranks only after hard constraints pass', async () => {
    const result = await evaluateCandidate(
      passenger,
      trip,
      policy,
      '2026-11-11T00:00:00.000Z',
      router,
    );
    expect(result.eligible).toBe(true);
    if (result.eligible) {
      expect(result.score).toBeGreaterThan(0);
      expect(result.parts.routeOverlap).toBeGreaterThan(0);
    }
  });

  it('never ranks an ineligible candidate', async () => {
    const result = await evaluateCandidate(
      passenger,
      trip,
      { ...policy, status: 'SUSPENDED' },
      '2026-11-11T00:00:00.000Z',
      router,
    );
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.reasonCodes).toContain('JURISDICTION_DISABLED');
    }
  });

  it('rejects time mismatch', async () => {
    const result = await evaluateCandidate(
      { ...passenger, window: { startIso: '2026-11-11T12:00:00.000Z', endIso: '2026-11-11T13:00:00.000Z' } },
      trip,
      policy,
      '2026-11-11T00:00:00.000Z',
      router,
    );
    expect(result.eligible).toBe(false);
  });
});
