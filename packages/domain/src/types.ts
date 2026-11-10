export type GeoPoint = { lat: number; lon: number };

export type RouteSnapshot = {
  routeVersionId: string;
  distanceM: number;
  durationS: number;
  geometryRef: string;
  provider: string;
};

export type StopType = 'PICKUP' | 'DROPOFF' | 'ORIGIN' | 'DESTINATION';

export type Stop = {
  sequence: number;
  type: StopType;
  userId: string;
  routeOffsetM: number;
  point: GeoPoint;
};

export type Segment = {
  startM: number;
  endM: number;
  occupantIds: string[];
  eligibleCostPaise: bigint;
};

export type Allocation = {
  userId: string;
  rawSharePaise: bigint;
  permittedContributionPaise: bigint;
  policyVersion: string;
  capApplied: boolean;
};

export type JurisdictionStatus =
  | 'DIRECTORY_ONLY'
  | 'WAITLIST'
  | 'APPROVED_PILOT'
  | 'LIVE'
  | 'SUSPENDED';

export type JurisdictionPolicy = {
  stateCode: string;
  cityCodes: string[] | null;
  effectiveFrom: string;
  effectiveTo?: string;
  status: JurisdictionStatus;
  eligibleVehicleTypes: string[];
  driverArrangementLimit?: { count: number; rollingDays: number };
  contributionRuleVersion: string;
  individualCapBps?: number;
  aggregateCapBps?: number;
  requiredDocuments: string[];
  mandatoryFeatures: string[];
  authorityReference?: string;
};

export type ErrorCode =
  | 'JURISDICTION_DISABLED'
  | 'USER_NOT_ELIGIBLE'
  | 'ROUTE_INCOMPATIBLE'
  | 'QUOTE_EXPIRED'
  | 'SEAT_UNAVAILABLE'
  | 'INVALID_STATE_TRANSITION'
  | 'OTP_INVALID_OR_EXPIRED'
  | 'PAYMENT_EVENT_DUPLICATE'
  | 'LOCATION_STALE_OR_IMPLAUSIBLE'
  | 'DRIVER_OR_VEHICLE_INELIGIBLE'
  | 'TIME_MISMATCH'
  | 'DRIVER_ROUTE_NOT_PRESERVED'
  | 'STOP_ORDER_INVALID'
  | 'DETOUR_EXCEEDED'
  | 'QUOTE_POLICY_BLOCKED'
  | 'DRIVER_FREQUENCY_EXCEEDED';

export type ApiSuccess<T> = {
  request_id: string;
  data: T;
  meta: { version: number };
};

export type ApiError = {
  request_id: string;
  error: {
    code: ErrorCode | string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
};

export type TimeWindow = { startIso: string; endIso: string };
