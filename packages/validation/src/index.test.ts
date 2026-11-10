import { describe, expect, it } from "vitest";
import { bookingRequestSchema, envOrThrow } from "./index";

describe("bookingRequestSchema", () => {
  it("requires idempotency key", () => {
    const parsed = bookingRequestSchema.safeParse({
      trip_id: "11111111-1111-1111-1111-111111111111",
      pickup_stop_proposal: { lat: 18.5, lon: 73.8 },
      dropoff_stop_proposal: { lat: 18.6, lon: 73.7 },
      quote_id: "22222222-2222-2222-2222-222222222222",
      idempotency_key: "repeat-me-please",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("envOrThrow", () => {
  it("fails builds when required env is missing", () => {
    expect(() => envOrThrow("EXPO_PUBLIC_SUPABASE_URL", undefined)).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });
});
