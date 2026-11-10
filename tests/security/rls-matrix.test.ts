import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("RLS migration", () => {
  const sql = readFileSync(resolve("supabase/migrations/0003_rls.sql"), "utf8");

  it("enables RLS on sensitive tables", () => {
    for (const table of [
      "profiles",
      "booking_requests",
      "latest_trip_locations",
      "pickup_otps",
      "payment_intents",
      "incidents",
      "vehicles",
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("forbids client location writes and otp reads", () => {
    expect(sql).toContain("locations_no_client_write");
    expect(sql).toContain("otps_no_select");
    expect(sql).toContain("using (false)");
  });
});
