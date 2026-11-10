create schema if not exists private;

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  aishe_code text,
  source text not null default 'manual',
  verification_state text not null default 'PENDING'
    check (verification_state in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now()
);

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  campus_name text not null,
  timezone text not null default 'Asia/Kolkata',
  boundary extensions.geometry(Polygon, 4326),
  created_at timestamptz not null default now()
);

create table public.pickup_zones (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id),
  name text not null,
  location extensions.geography(Point, 4326) not null,
  approved boolean not null default false
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone_verified_at timestamptz,
  email_verified_at timestamptz,
  date_of_birth date,
  account_state text not null default 'PENDING'
    check (account_state in ('PENDING', 'ACTIVE', 'SUSPENDED')),
  primary_institution_id uuid references public.institutions(id),
  primary_campus_id uuid references public.campuses(id),
  adult_attested_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profile_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('passenger', 'driver', 'institution_admin', 'ops_reviewer', 'platform_admin')),
  granted_at timestamptz not null default now(),
  granted_by uuid,
  primary key (user_id, role)
);

create table public.verification_cases (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references public.profiles(id),
  case_type text not null check (case_type in ('STUDENT', 'DRIVER', 'VEHICLE')),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  reviewer_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  reason_code text,
  created_at timestamptz not null default now()
);

create table private.identity_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  document_type text not null,
  storage_path text not null,
  masked_label text,
  expires_on date,
  verification_state text not null default 'PENDING',
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  registration_display_mask text not null,
  registration_hash text not null,
  vehicle_class text not null default 'PRIVATE_CAR',
  non_transport boolean not null default true,
  seat_capacity int not null check (seat_capacity > 0 and seat_capacity <= 8),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'EXPIRED', 'REJECTED')),
  created_at timestamptz not null default now()
);

create table private.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  document_type text not null,
  storage_path text not null,
  valid_from date,
  valid_to date,
  verification_state text not null default 'PENDING'
);

create table public.jurisdiction_policies (
  id uuid primary key default gen_random_uuid(),
  state_code text not null,
  city_codes text[],
  effective_from timestamptz not null,
  effective_to timestamptz,
  status text not null check (status in ('DIRECTORY_ONLY', 'WAITLIST', 'APPROVED_PILOT', 'LIVE', 'SUSPENDED')),
  eligible_vehicle_types text[] not null default array['PRIVATE_CAR'],
  driver_arrangement_limit_count int,
  driver_arrangement_limit_days int,
  contribution_rule_version text not null,
  individual_cap_bps int,
  aggregate_cap_bps int,
  required_documents text[] not null default '{}',
  mandatory_features text[] not null default '{}',
  authority_reference text,
  created_at timestamptz not null default now()
);

create table public.commute_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  role text not null check (role in ('passenger', 'driver')),
  origin extensions.geography(Point, 4326) not null,
  destination extensions.geography(Point, 4326) not null,
  recurrence_days text[] not null,
  local_time time not null,
  timezone text not null default 'Asia/Kolkata',
  flex_minutes int not null default 20 check (flex_minutes > 0),
  max_walk_m int,
  max_detour_s int,
  seats int not null default 1 check (seats > 0),
  vehicle_id uuid references public.vehicles(id),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_versions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  geometry_ref text not null,
  route_geom extensions.geometry(LineString, 4326) not null,
  distance_m int not null check (distance_m > 0),
  duration_s int not null check (duration_s > 0),
  version int not null default 1,
  created_at timestamptz not null default now()
);

create index route_versions_geom_gix on public.route_versions using gist (route_geom);

create table public.trip_occurrences (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.commute_templates(id),
  driver_id uuid not null references public.profiles(id),
  service_date date not null,
  state text not null default 'DRAFT'
    check (state in ('DRAFT', 'PUBLISHED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  route_version_id uuid references public.route_versions(id),
  available_seats int not null check (available_seats >= 0),
  jurisdiction_policy_id uuid references public.jurisdiction_policies(id),
  departure_start timestamptz not null,
  departure_end timestamptz not null,
  unique (template_id, service_date)
);

create index trip_occurrences_lookup_idx
  on public.trip_occurrences (jurisdiction_policy_id, state, service_date, departure_start);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip_occurrences(id) on delete cascade,
  sequence int not null,
  stop_type text not null check (stop_type in ('ORIGIN', 'PICKUP', 'DROPOFF', 'DESTINATION')),
  location extensions.geography(Point, 4326) not null,
  route_offset_m int not null check (route_offset_m >= 0),
  participant_id uuid references public.profiles(id),
  status text not null default 'PLANNED' check (status in ('PLANNED', 'VERIFIED', 'SKIPPED')),
  unique (trip_id, sequence)
);

create table public.match_candidates (
  id uuid primary key default gen_random_uuid(),
  passenger_intent_id uuid not null references public.commute_templates(id),
  trip_id uuid not null references public.trip_occurrences(id),
  hard_filter_passed boolean not null,
  score numeric,
  score_breakdown jsonb not null default '{}',
  reason_codes text[] not null default '{}',
  expires_at timestamptz not null
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip_occurrences(id),
  passenger_id uuid not null references public.profiles(id),
  requested_seats int not null check (requested_seats > 0),
  quote_id uuid,
  route_version_id uuid,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED', 'HELD', 'ACCEPTED', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  idempotency_key text not null,
  expected_version int not null default 1,
  created_at timestamptz not null default now(),
  unique (passenger_id, idempotency_key)
);

create table public.seat_holds (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip_occurrences(id),
  booking_id uuid not null references public.booking_requests(id),
  seats int not null check (seats > 0),
  expires_at timestamptz not null,
  state text not null default 'ACTIVE' check (state in ('ACTIVE', 'RELEASED', 'CONVERTED')),
  unique (booking_id)
);

create table public.cost_quotes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip_occurrences(id),
  route_version_id uuid not null references public.route_versions(id),
  pricing_policy_version text not null,
  currency text not null default 'INR',
  total_cost_paise bigint not null check (total_cost_paise >= 0),
  quote_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz
);

create table public.journey_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trip_occurrences(id),
  quote_id uuid not null references public.cost_quotes(id),
  sequence int not null,
  start_m int not null,
  end_m int not null check (end_m > start_m),
  eligible_cost_paise bigint not null,
  occupant_ids uuid[] not null
);

create table public.cost_allocations (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.journey_segments(id),
  user_id uuid not null references public.profiles(id),
  raw_share_paise bigint not null,
  permitted_share_paise bigint not null,
  cap_applied boolean not null default false,
  reason_code text
);

create table public.trip_events (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trip_occurrences(id),
  event_type text not null,
  actor_id uuid references public.profiles(id),
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}'
);

create table public.latest_trip_locations (
  trip_id uuid not null references public.trip_occurrences(id),
  user_id uuid not null references public.profiles(id),
  loc extensions.geography(Point, 4326) not null,
  accuracy_m numeric not null,
  captured_at timestamptz not null,
  sequence_no int not null,
  primary key (trip_id, user_id)
);

create table public.pickup_otps (
  booking_id uuid primary key references public.booking_requests(id),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  subject_id uuid references public.profiles(id),
  trip_id uuid references public.trip_occurrences(id),
  category text not null,
  severity text not null,
  status text not null default 'OPEN',
  assigned_reviewer_id uuid references public.profiles(id),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id),
  blocked_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_requests(id),
  payer_id uuid not null references public.profiles(id),
  amount_paise bigint not null,
  currency text not null default 'INR',
  provider text not null default 'stub',
  state text not null default 'CREATED',
  idempotency_key text not null unique
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  payment_intent_id uuid references public.payment_intents(id),
  signature_verified_at timestamptz,
  process_state text not null default 'RECEIVED'
);

create table public.command_idempotency (
  key text primary key,
  actor_id uuid not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create index latest_trip_locations_ttl_idx on public.latest_trip_locations (captured_at);
create index seat_holds_expiry_idx on public.seat_holds (expires_at) where state = 'ACTIVE';
