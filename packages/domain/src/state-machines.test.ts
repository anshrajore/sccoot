import { describe, expect, it } from 'vitest';
import { canTransitionBooking, canTransitionTrip, transitionTrip } from './state-machines.js';
import { assertPolicyAllowsMatching } from './policy.js';
import type { JurisdictionPolicy } from './types.js';

describe('trip state machine', () => {
  it('allows published -> confirmed -> active -> completed', () => {
    expect(canTransitionTrip('PUBLISHED', 'CONFIRMED')).toBe(true);
    expect(canTransitionTrip('CONFIRMED', 'ACTIVE')).toBe(true);
    expect(canTransitionTrip('ACTIVE', 'COMPLETED')).toBe(true);
  });

  it('rejects client-style skip from published to completed', () => {
    expect(canTransitionTrip('PUBLISHED', 'COMPLETED')).toBe(false);
    expect(() => transitionTrip('PUBLISHED', 'COMPLETED')).toThrow('INVALID_STATE_TRANSITION');
  });
});

describe('booking state machine', () => {
  it('does not reopen expired bookings', () => {
    expect(canTransitionBooking('EXPIRED', 'CONFIRMED')).toBe(false);
  });
});

describe('jurisdiction policy', () => {
  const live: JurisdictionPolicy = {
    stateCode: 'MH',
    cityCodes: ['PUNE'],
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    status: 'LIVE',
    eligibleVehicleTypes: ['PRIVATE_CAR'],
    contributionRuleVersion: 'mh-2026-v1',
    requiredDocuments: [],
    mandatoryFeatures: [],
    authorityReference: 'MVR-0821/C.R.95/Tra-2',
  };

  it('fails closed when missing or directory-only', () => {
    expect(assertPolicyAllowsMatching(null, '2026-11-10T00:00:00.000Z').ok).toBe(false);
    expect(
      assertPolicyAllowsMatching({ ...live, status: 'DIRECTORY_ONLY' }, '2026-11-10T00:00:00.000Z')
        .ok,
    ).toBe(false);
  });

  it('allows LIVE within effective dates', () => {
    expect(assertPolicyAllowsMatching(live, '2026-11-10T00:00:00.000Z').ok).toBe(true);
  });
});
