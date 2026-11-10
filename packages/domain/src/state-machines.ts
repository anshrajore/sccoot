export const bookingStates = [
  'REQUESTED',
  'HELD',
  'ACCEPTED',
  'CONFIRMED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type BookingState = (typeof bookingStates)[number];

export const tripStates = [
  'DRAFT',
  'PUBLISHED',
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;
export type TripState = (typeof tripStates)[number];

const bookingTransitions: Record<BookingState, BookingState[]> = {
  REQUESTED: ['HELD', 'CANCELLED', 'EXPIRED'],
  HELD: ['ACCEPTED', 'CANCELLED', 'EXPIRED'],
  ACCEPTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  CANCELLED: [],
  EXPIRED: [],
};

const tripTransitions: Record<TripState, TripState[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionBooking(from: BookingState, to: BookingState): boolean {
  return bookingTransitions[from].includes(to);
}

export function canTransitionTrip(from: TripState, to: TripState): boolean {
  return tripTransitions[from].includes(to);
}

export function transitionBooking(from: BookingState, to: BookingState): BookingState {
  if (!canTransitionBooking(from, to)) {
    throw new Error('INVALID_STATE_TRANSITION');
  }
  return to;
}

export function transitionTrip(from: TripState, to: TripState): TripState {
  if (!canTransitionTrip(from, to)) {
    throw new Error('INVALID_STATE_TRANSITION');
  }
  return to;
}
