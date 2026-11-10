do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('kyc-private', 'kyc-private', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- Private realtime: only trip participants can insert/select on trip topics.
-- Applied when realtime.messages exists (Supabase Realtime authorization).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'realtime' and table_name = 'messages'
  ) then
    execute $p$
      create policy scoot_trip_broadcast
      on realtime.messages
      for select
      to authenticated
      using (
        topic like 'trip:%'
        and public.is_trip_participant(replace(topic, 'trip:', '')::uuid)
      )
    $p$;
  end if;
end $$;
