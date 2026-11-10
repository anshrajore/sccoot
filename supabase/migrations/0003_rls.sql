alter table public.institutions enable row level security;
alter table public.campuses enable row level security;
alter table public.pickup_zones enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_roles enable row level security;
alter table public.verification_cases enable row level security;
alter table public.vehicles enable row level security;
alter table public.jurisdiction_policies enable row level security;
alter table public.commute_templates enable row level security;
alter table public.route_versions enable row level security;
alter table public.trip_occurrences enable row level security;
alter table public.trip_stops enable row level security;
alter table public.match_candidates enable row level security;
alter table public.booking_requests enable row level security;
alter table public.seat_holds enable row level security;
alter table public.cost_quotes enable row level security;
alter table public.journey_segments enable row level security;
alter table public.cost_allocations enable row level security;
alter table public.trip_events enable row level security;
alter table public.latest_trip_locations enable row level security;
alter table public.pickup_otps enable row level security;
alter table public.incidents enable row level security;
alter table public.blocks enable row level security;
alter table public.payment_intents enable row level security;
alter table public.payment_events enable row level security;
alter table public.command_idempotency enable row level security;

revoke all on schema private from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profile_roles
    where user_id = auth.uid()
      and role in ('ops_reviewer', 'platform_admin')
  );
$$;

create or replace function public.is_trip_participant(p_trip uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.trip_occurrences t
    where t.id = p_trip and t.driver_id = auth.uid()
  ) or exists (
    select 1 from public.booking_requests b
    where b.trip_id = p_trip
      and b.passenger_id = auth.uid()
      and b.status in ('ACCEPTED', 'CONFIRMED', 'HELD')
  );
$$;

-- Directory
create policy institutions_read on public.institutions for select using (true);
create policy campuses_read on public.campuses for select using (true);
create policy pickup_zones_read on public.pickup_zones for select using (approved = true or public.is_staff());
create policy policies_read on public.jurisdiction_policies for select to authenticated using (true);
create policy policies_write_admin on public.jurisdiction_policies for all to authenticated
  using (exists (select 1 from public.profile_roles r where r.user_id = auth.uid() and r.role = 'platform_admin'))
  with check (exists (select 1 from public.profile_roles r where r.user_id = auth.uid() and r.role = 'platform_admin'));

-- Profiles
create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_self_update on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid());
create policy profiles_insert_self on public.profiles for insert with check (id = auth.uid());

create policy roles_self_read on public.profile_roles for select using (user_id = auth.uid() or public.is_staff());
create policy roles_no_client_grant on public.profile_roles for insert with check (false);
create policy roles_no_client_update on public.profile_roles for update using (false);

create policy vehicles_owner on public.vehicles for select using (owner_id = auth.uid() or public.is_staff());
create policy vehicles_owner_write on public.vehicles for insert with check (owner_id = auth.uid());

create policy templates_owner on public.commute_templates for select using (owner_id = auth.uid() or public.is_staff());
create policy templates_owner_write on public.commute_templates for insert with check (owner_id = auth.uid());
create policy templates_owner_update on public.commute_templates for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy trips_visible on public.trip_occurrences for select using (
  state in ('PUBLISHED', 'ACTIVE') or driver_id = auth.uid() or public.is_staff()
);
create policy trips_no_direct_write on public.trip_occurrences for insert with check (false);
create policy trips_no_direct_update on public.trip_occurrences for update using (false);

create policy bookings_parties on public.booking_requests for select using (
  passenger_id = auth.uid()
  or exists (select 1 from public.trip_occurrences t where t.id = trip_id and t.driver_id = auth.uid())
  or public.is_staff()
);
create policy bookings_no_direct_status on public.booking_requests for update using (false);
create policy bookings_insert_self on public.booking_requests for insert with check (passenger_id = auth.uid());

create policy holds_parties on public.seat_holds for select using (
  exists (select 1 from public.booking_requests b where b.id = booking_id and (b.passenger_id = auth.uid() or public.is_staff()))
  or exists (
    select 1 from public.booking_requests b
    join public.trip_occurrences t on t.id = b.trip_id
    where b.id = booking_id and t.driver_id = auth.uid()
  )
);

create policy quotes_parties on public.cost_quotes for select using (
  exists (
    select 1 from public.booking_requests b
    where b.quote_id = id and (b.passenger_id = auth.uid() or public.is_staff())
  ) or exists (
    select 1 from public.trip_occurrences t where t.id = trip_id and t.driver_id = auth.uid()
  )
);

create policy locations_participants on public.latest_trip_locations for select using (
  public.is_trip_participant(trip_id)
);
create policy locations_no_client_write on public.latest_trip_locations for insert with check (false);
create policy locations_no_client_update on public.latest_trip_locations for update using (false);

create policy otps_no_select on public.pickup_otps for select using (false);

create policy incidents_reporter on public.incidents for select using (
  reporter_id = auth.uid() or assigned_reviewer_id = auth.uid() or public.is_staff()
);
create policy incidents_insert on public.incidents for insert with check (reporter_id = auth.uid());

create policy payments_party on public.payment_intents for select using (payer_id = auth.uid() or public.is_staff());
create policy payment_events_staff on public.payment_events for select using (public.is_staff());

create policy verification_subject on public.verification_cases for select using (
  subject_user_id = auth.uid() or reviewer_id = auth.uid() or public.is_staff()
);

create policy match_owner on public.match_candidates for select using (
  exists (select 1 from public.commute_templates c where c.id = passenger_intent_id and c.owner_id = auth.uid())
  or public.is_staff()
);

create policy stops_visible on public.trip_stops for select using (public.is_trip_participant(trip_id) or public.is_staff());
create policy events_participants on public.trip_events for select using (public.is_trip_participant(trip_id) or public.is_staff());
create policy segments_parties on public.journey_segments for select using (
  exists (select 1 from public.trip_occurrences t where t.id = trip_id and (t.driver_id = auth.uid() or public.is_staff()))
);
create policy allocations_self on public.cost_allocations for select using (user_id = auth.uid() or public.is_staff());
create policy blocks_self on public.blocks for select using (blocker_id = auth.uid() or public.is_staff());
create policy command_idemp_none on public.command_idempotency for select using (false);
create policy route_versions_auth on public.route_versions for select to authenticated using (true);
