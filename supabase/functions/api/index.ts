import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { createHash, randomUUID } from "node:crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, idempotency-key",
};

function json(requestId: string, body: unknown, status = 200) {
  return new Response(JSON.stringify({ request_id: requestId, ...body }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function fail(
  requestId: string,
  code: string,
  message: string,
  status = 400,
  retryable = false,
  details?: Record<string, unknown>,
) {
  return json(requestId, { error: { code, message, retryable, details } }, status);
}

function tripIdFrom(path: string): string {
  return path.split("/")[3] ?? "";
}

function bookingIdFrom(path: string): string {
  return path.split("/")[3] ?? "";
}

Deno.serve(async (req) => {
  const requestId = randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/api/, "").replace(/^\/api/, "");
  const normalized = path.startsWith("/v1") ? path : `/v1${path.replace(/^\/v1/, "")}`;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anon || !service) {
    return fail(requestId, "MISCONFIGURED", "Missing required environment variable", 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, service);
  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return fail(requestId, "USER_NOT_ELIGIBLE", "Verified session required", 401);

  const route = `${req.method} ${normalized}`;

  try {
    if (route === "POST /v1/commute-intents") {
      const body = await req.json();
      const { data, error } = await admin
        .from("commute_templates")
        .insert({
          owner_id: user.id,
          role: body.role,
          origin: `SRID=4326;POINT(${body.origin_anchor.lon} ${body.origin_anchor.lat})`,
          destination: `SRID=4326;POINT(${body.destination.lon} ${body.destination.lat})`,
          recurrence_days: body.recurrence?.days ?? ["mon", "tue", "wed", "thu", "fri"],
          local_time: `${body.recurrence?.local_time ?? "08:30"}:00`,
          timezone: body.recurrence?.timezone ?? "Asia/Kolkata",
          flex_minutes: body.time_window_minutes ?? 20,
          max_walk_m: body.max_walk_m ?? 400,
          seats: body.seats ?? 1,
          status: "ACTIVE",
        })
        .select()
        .single();
      if (error) return fail(requestId, "INVALID_STATE_TRANSITION", error.message);
      return json(requestId, { data, meta: { version: 1 } });
    }

    if (route === "POST /v1/matches/preview") {
      const { data: policy } = await admin
        .from("jurisdiction_policies")
        .select("*")
        .eq("state_code", "MH")
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!policy || !["LIVE", "APPROVED_PILOT"].includes(policy.status) || !policy.authority_reference) {
        return fail(requestId, "JURISDICTION_DISABLED", "Live service not approved in this area");
      }
      return json(requestId, {
        data: {
          candidates: [
            {
              trip_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              score: 0.81,
              score_parts: {
                routeOverlap: 0.72,
                pickupWalk: 0.78,
                detour: 0.73,
                scheduleFit: 0.8,
                reliability: 0.8,
              },
              permitted_contribution_paise: 3333,
              raw_share_paise: 3333,
              seats: 2,
            },
          ],
          policy_version: policy.contribution_rule_version,
        },
        meta: { version: 1 },
      });
    }

    if (route === "POST /v1/bookings") {
      const body = await req.json();
      const idem = body.idempotency_key as string;
      if (!idem) return fail(requestId, "INVALID_STATE_TRANSITION", "idempotency_key required");
      const { data: existing } = await admin.from("command_idempotency").select("response").eq("key", idem).maybeSingle();
      if (existing) return json(requestId, existing.response);

      const { data: booking, error } = await admin
        .from("booking_requests")
        .insert({
          trip_id: body.trip_id,
          passenger_id: user.id,
          requested_seats: body.seats ?? 1,
          quote_id: body.quote_id,
          status: "REQUESTED",
          idempotency_key: idem,
        })
        .select()
        .single();
      if (error) return fail(requestId, "INVALID_STATE_TRANSITION", error.message);

      const { data: reserved } = await admin.rpc("reserve_seats", {
        p_trip_id: body.trip_id,
        p_booking_id: booking.id,
        p_seats: body.seats ?? 1,
      });
      const ok = Array.isArray(reserved) ? reserved[0]?.ok : reserved?.ok;
      if (!ok) return fail(requestId, "SEAT_UNAVAILABLE", "The requested seat is no longer available.");

      await admin.from("booking_requests").update({ status: "HELD" }).eq("id", booking.id);
      const payload = { data: { id: booking.id, status: "HELD" }, meta: { version: 1 } };
      await admin.from("command_idempotency").insert({ key: idem, actor_id: user.id, response: payload });
      return json(requestId, payload);
    }

    if (route.startsWith("POST /v1/bookings/") && normalized.endsWith("/accept")) {
      const id = bookingIdFrom(normalized);
      const { data: booking } = await admin.from("booking_requests").select("*, trip_occurrences!inner(driver_id)").eq("id", id).single();
      const driverId = (booking as { trip_occurrences?: { driver_id: string } } | null)?.trip_occurrences?.driver_id;
      if (!booking || driverId !== user.id) {
        return fail(requestId, "USER_NOT_ELIGIBLE", "Only the driver-user can accept");
      }
      if (booking.status !== "HELD" && booking.status !== "REQUESTED") {
        return fail(requestId, "INVALID_STATE_TRANSITION", "Command not allowed from current trip state");
      }
      await admin.from("booking_requests").update({ status: "ACCEPTED" }).eq("id", id);
      return json(requestId, { data: { id, status: "ACCEPTED" }, meta: { version: 1 } });
    }

    if (route.startsWith("POST /v1/bookings/") && normalized.endsWith("/confirm")) {
      const id = bookingIdFrom(normalized);
      const body = await req.json();
      const { data: booking } = await admin.from("booking_requests").select("*").eq("id", id).single();
      if (!booking || booking.status !== "ACCEPTED") {
        return fail(requestId, "INVALID_STATE_TRANSITION", "Command not allowed from current trip state");
      }
      await admin.from("booking_requests").update({ status: "CONFIRMED" }).eq("id", id);
      await admin.from("trip_occurrences").update({ state: "CONFIRMED" }).eq("id", booking.trip_id).eq("state", "PUBLISHED");
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const hash = createHash("sha256").update(otp).digest("hex");
      await admin.from("pickup_otps").upsert({
        booking_id: id,
        code_hash: hash,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        attempts: 0,
      });
      return json(requestId, {
        data: { id, status: "CONFIRMED", quote_hash: body.quote_hash ?? null, otp_issued: true },
        meta: { version: 1 },
      });
    }

    if (route.startsWith("POST /v1/trips/") && normalized.endsWith("/pickup/verify")) {
      const body = await req.json();
      const { data: otp } = await admin.from("pickup_otps").select("*").eq("booking_id", body.booking_id).maybeSingle();
      if (!otp || otp.consumed_at || new Date(otp.expires_at) < new Date()) {
        return fail(requestId, "OTP_INVALID_OR_EXPIRED", "Pickup token failed validation");
      }
      const hash = createHash("sha256").update(String(body.otp)).digest("hex");
      if (hash !== otp.code_hash) {
        await admin.from("pickup_otps").update({ attempts: otp.attempts + 1 }).eq("booking_id", body.booking_id);
        return fail(requestId, "OTP_INVALID_OR_EXPIRED", "Pickup token failed validation");
      }
      await admin.from("pickup_otps").update({ consumed_at: new Date().toISOString() }).eq("booking_id", body.booking_id);
      const tripId = tripIdFrom(normalized);
      await admin.from("trip_occurrences").update({ state: "ACTIVE" }).eq("id", tripId).in("state", ["PUBLISHED", "CONFIRMED"]);
      return json(requestId, { data: { status: "PICKUP_VERIFIED" }, meta: { version: 1 } });
    }

    if (route.startsWith("POST /v1/trips/") && normalized.endsWith("/location")) {
      const body = await req.json();
      const tripId = tripIdFrom(normalized);
      const captured = new Date(body.captured_at);
      if (Number.isNaN(captured.getTime()) || Date.now() - captured.getTime() > 30_000 || body.accuracy_m > 80) {
        return fail(requestId, "LOCATION_STALE_OR_IMPLAUSIBLE", "Location failed freshness/accuracy validation");
      }
      const { data: trip } = await admin.from("trip_occurrences").select("driver_id,state").eq("id", tripId).single();
      if (!trip || trip.driver_id !== user.id || trip.state !== "ACTIVE") {
        return fail(requestId, "INVALID_STATE_TRANSITION", "Command not allowed from current trip state");
      }
      await admin.from("latest_trip_locations").upsert({
        trip_id: tripId,
        user_id: user.id,
        loc: `SRID=4326;POINT(${body.lon} ${body.lat})`,
        accuracy_m: body.accuracy_m,
        captured_at: body.captured_at,
        sequence_no: body.sequence_no,
      });
      return json(requestId, { data: { status: "OK" }, meta: { version: 1 } });
    }

    if (route.startsWith("POST /v1/trips/") && normalized.endsWith("/dropoff/verify")) {
      const tripId = tripIdFrom(normalized);
      const body = await req.json();
      const { data: trip } = await admin.from("trip_occurrences").select("state").eq("id", tripId).single();
      if (!trip || trip.state !== "ACTIVE") {
        return fail(requestId, "INVALID_STATE_TRANSITION", "Command not allowed from current trip state");
      }
      await admin.from("trip_stops").update({ status: "VERIFIED" }).eq("trip_id", tripId).eq("participant_id", body.booking_id ? user.id : user.id);
      await admin.from("trip_occurrences").update({ state: "COMPLETED" }).eq("id", tripId);
      return json(requestId, { data: { status: "DROPOFF_VERIFIED" }, meta: { version: 1 } });
    }

    if (route === "POST /v1/safety/incidents") {
      const body = await req.json();
      const { data, error } = await admin
        .from("incidents")
        .insert({
          reporter_id: user.id,
          trip_id: body.trip_id,
          category: body.category,
          severity: body.severity,
          description: body.description,
          status: "OPEN",
        })
        .select()
        .single();
      if (error) return fail(requestId, "INVALID_STATE_TRANSITION", error.message);
      return json(requestId, { data, meta: { version: 1 } });
    }

    return fail(requestId, "INVALID_STATE_TRANSITION", `Unknown command ${route}`, 404);
  } catch (err) {
    return fail(requestId, "INVALID_STATE_TRANSITION", err instanceof Error ? err.message : "error", 500, true);
  }
});
