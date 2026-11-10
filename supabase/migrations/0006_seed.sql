insert into public.institutions (id, canonical_name, aishe_code, source, verification_state)
values
  ('11111111-1111-1111-1111-111111111111', 'Pilot Institute of Technology Pune', 'U-9999', 'manual', 'APPROVED');

insert into public.campuses (id, institution_id, campus_name, timezone)
values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Hinjawadi campus', 'Asia/Kolkata');

insert into public.pickup_zones (campus_id, name, location, approved)
values
  (
    '22222222-2222-2222-2222-222222222222',
    'Gate 3',
    extensions.st_geogfromtext('SRID=4326;POINT(73.738 18.591)'),
    true
  );

-- DIRECTORY_ONLY national placeholder vs LIVE corridor (activation remains a counsel gate).
insert into public.jurisdiction_policies (
  state_code, city_codes, effective_from, status, contribution_rule_version,
  individual_cap_bps, aggregate_cap_bps, authority_reference, required_documents, mandatory_features
) values
  ('IN', null, '2026-01-01', 'DIRECTORY_ONLY', 'directory-v1', null, null, null, '{}', '{}'),
  ('MH', array['PUN'], '2026-01-01', 'DIRECTORY_ONLY', 'mh-2026-v1', 2500, 5000, 'MVR-0821/C.R.95/Tra-2',
    array['DL','RC','INSURANCE'], array['OTP','SOS']);
