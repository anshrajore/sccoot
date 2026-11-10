create or replace function public.reserve_seats(
  p_trip_id uuid,
  p_booking_id uuid,
  p_seats int,
  p_hold_minutes int default 10
)
returns table(ok boolean, available_seats int)
language plpgsql
security definer
set search_path = public
as $$
declare
  seats_left int;
  updated int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select t.available_seats into seats_left
  from public.trip_occurrences t
  where t.id = p_trip_id
  for update;

  if seats_left is null then
    return query select false, 0;
    return;
  end if;

  update public.trip_occurrences
  set available_seats = available_seats - p_seats
  where id = p_trip_id
    and available_seats >= p_seats
    and state = 'PUBLISHED';

  get diagnostics updated = row_count;
  if updated <> 1 then
    return query select false, seats_left;
    return;
  end if;

  insert into public.seat_holds (trip_id, booking_id, seats, expires_at, state)
  values (p_trip_id, p_booking_id, p_seats, now() + make_interval(mins => p_hold_minutes), 'ACTIVE');

  insert into public.trip_events (trip_id, event_type, actor_id, payload)
  values (p_trip_id, 'SEAT_HELD', auth.uid(), jsonb_build_object('booking_id', p_booking_id, 'seats', p_seats));

  select t.available_seats into seats_left from public.trip_occurrences t where t.id = p_trip_id;
  return query select true, seats_left;
end;
$$;

revoke all on function public.reserve_seats(uuid, uuid, int, int) from public, anon;
grant execute on function public.reserve_seats(uuid, uuid, int, int) to authenticated, service_role;

create or replace function public.expire_seat_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  r record;
begin
  for r in
    select * from public.seat_holds
    where state = 'ACTIVE' and expires_at < now()
    for update skip locked
  loop
    update public.seat_holds set state = 'RELEASED' where id = r.id and state = 'ACTIVE';
    if found then
      update public.trip_occurrences
      set available_seats = available_seats + r.seats
      where id = r.trip_id;
      update public.booking_requests set status = 'EXPIRED' where id = r.booking_id and status in ('REQUESTED', 'HELD');
      insert into public.trip_events (trip_id, event_type, payload)
      values (r.trip_id, 'HOLD_EXPIRED', jsonb_build_object('booking_id', r.booking_id));
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

create or replace function public.materialize_trip_occurrences(p_from date, p_to date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int := 0;
begin
  insert into public.trip_occurrences (
    template_id, driver_id, service_date, state, available_seats, departure_start, departure_end
  )
  select
    c.id,
    c.owner_id,
    d::date,
    'DRAFT',
    c.seats,
    ((d::text || ' ' || c.local_time::text)::timestamp at time zone c.timezone) - make_interval(mins => c.flex_minutes),
    ((d::text || ' ' || c.local_time::text)::timestamp at time zone c.timezone) + make_interval(mins => c.flex_minutes)
  from public.commute_templates c
  cross join generate_series(p_from, p_to, interval '1 day') as d
  where c.status = 'ACTIVE'
    and c.role = 'driver'
    and lower(to_char(d, 'dy')) = any (c.recurrence_days)
  on conflict (template_id, service_date) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
