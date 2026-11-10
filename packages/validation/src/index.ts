import { z } from "zod";

export const geoPoint = z.object({ lat: z.number().gte(-90).lte(90), lon: z.number().gte(-180).lte(180) });

export const commuteIntentSchema = z.object({
  role: z.enum(["passenger", "driver"]),
  origin_anchor: geoPoint,
  destination: geoPoint,
  recurrence: z.object({
    days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).min(1),
    timezone: z.string().min(1),
    local_time: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  time_window_minutes: z.number().int().positive().max(180),
  max_walk_m: z.number().int().min(0).max(2000).optional(),
  seats: z.number().int().min(1).max(6).default(1),
});

export const bookingRequestSchema = z.object({
  trip_id: z.string().uuid(),
  pickup_stop_proposal: geoPoint,
  dropoff_stop_proposal: geoPoint,
  quote_id: z.string().uuid(),
  seats: z.number().int().min(1).max(3).default(1),
  idempotency_key: z.string().min(8).max(128),
});

export const locationPublishSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  accuracy_m: z.number().positive().max(200),
  captured_at: z.string().datetime(),
  sequence_no: z.number().int().nonnegative(),
});

export const incidentSchema = z.object({
  trip_id: z.string().uuid(),
  category: z.enum(["SAFETY", "HARASSMENT", "VEHICLE", "ROUTE", "OTHER"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(8).max(2000),
});

export function envOrThrow(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const locationPublishSchemaTest = locationPublishSchema;
