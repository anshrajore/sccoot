# ADR-004 Error envelope

Status: accepted

Every JSON response includes `request_id`. Success: `{ request_id, data, meta }`. Failure: `{ request_id, error: { code, message, retryable, details } }`.

Stable codes include `JURISDICTION_DISABLED`, `USER_NOT_ELIGIBLE`, `ROUTE_INCOMPATIBLE`, `QUOTE_EXPIRED`, `SEAT_UNAVAILABLE`, `INVALID_STATE_TRANSITION`, `OTP_INVALID_OR_EXPIRED`, `PAYMENT_EVENT_DUPLICATE`, `LOCATION_STALE_OR_IMPLAUSIBLE`.
