-- Live help requests and chat (Find a Volunteer). Review before applying:
--   supabase db push   (or paste into the SQL editor)
-- Then check Database → Publications → supabase_realtime lists help_requests and messages.
--
-- A minimal stand-in for matching, on its own tables so the real matching service can replace it:
--   1. A visitor inserts a help_requests row (status 'open').
--   2. Volunteers see open requests (RLS) and call accept_help_request(id). It succeeds only while the
--      request is still open, so two volunteers can't both get it; the loser gets 'already_taken'.
--   3. The visitor and the volunteer exchange messages; each app translates what it reads.
--   4. close_help_request(id, 'cancelled' | 'done') ends it, for either of them.
-- Matches src/features/volunteer/supabase-backend.ts and the mock in scripts/mock-supabase.mjs.
-- Reads the volunteer's profile (public.profiles), but none of the matching team's tables.

create table public.help_requests (
  id                  uuid primary key default gen_random_uuid(),
  visitor_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- First name, so the volunteer knows who to look for.
  visitor_name        text not null default '' check (char_length(visitor_name) <= 40),
  venue_id            text not null check (char_length(venue_id) between 1 and 40),
  -- A facility id at that venue, e.g. 'entry-4'; null when the visitor isn't sure.
  spot                text check (char_length(spot) <= 80),
  help_types          text[] not null check (
                        cardinality(help_types) between 1 and 6
                        and help_types <@ array['physical','directions','language','quiet','lost','other']),
  note                text not null default '' check (char_length(note) <= 500),
  -- The language the visitor wants help in, e.g. 'es'.
  language            text not null check (char_length(language) between 2 and 12),
  status              text not null default 'open' check (status in ('open', 'matched', 'cancelled', 'done')),

  -- Filled in by accept_help_request from the volunteer's profile, so the visitor sees who is
  -- coming without reading anyone else's profile: first name, languages (main first), trainings, gender
  -- (only for "on his / her / their way").
  volunteer_id        uuid references auth.users (id) on delete set null,
  volunteer_name      text,
  volunteer_languages text[],
  volunteer_trainings text[],
  volunteer_gender    text,

  closed_by           uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  matched_at          timestamptz,
  closed_at           timestamptz,

  constraint matched_has_volunteer check (status in ('open', 'cancelled') or volunteer_id is not null)
);

create index help_requests_open on public.help_requests (created_at desc) where status = 'open';
create index help_requests_visitor on public.help_requests (visitor_id);
create index help_requests_volunteer on public.help_requests (volunteer_id);

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.help_requests (id) on delete cascade,
  sender_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 1000),
  -- The language the sender writes in (their chat language), so the reader's app knows what to translate.
  language    text check (char_length(language) between 2 and 12),
  created_at  timestamptz not null default now()
);

create index messages_request on public.messages (request_id, created_at);

-- True when the signed-in user's profile is a volunteer. Security definer so policies can ask
-- without depending on the profiles policies (and it reads one column of one row).
create function public.is_volunteer() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'volunteer');
$$;

-- True when the signed-in user is the visitor or the accepted volunteer on a request.
create function public.is_help_party(p_request_id uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.help_requests r
    where r.id = p_request_id and (select auth.uid()) in (r.visitor_id, r.volunteer_id)
  );
$$;

revoke all on function public.is_volunteer() from public;
revoke all on function public.is_help_party(uuid) from public;
grant execute on function public.is_volunteer() to authenticated;
grant execute on function public.is_help_party(uuid) to authenticated;

-- Row-level security. Visitors read their own requests; volunteers read open requests and the ones
-- they accepted. Status changes only go through the functions below, so no one updates rows directly.
alter table public.help_requests enable row level security;

create policy "read own or open requests" on public.help_requests
  for select to authenticated using (
    (select auth.uid()) = visitor_id
    or (select auth.uid()) = volunteer_id
    or (status = 'open' and (select public.is_volunteer()))
  );

create policy "visitors open requests" on public.help_requests
  for insert to authenticated with check (
    (select auth.uid()) = visitor_id
    and status = 'open'
    and volunteer_id is null and volunteer_name is null and volunteer_languages is null
    and volunteer_trainings is null and volunteer_gender is null
    and closed_by is null and matched_at is null and closed_at is null
  );

revoke all on public.help_requests from anon, authenticated;
grant select, insert on public.help_requests to authenticated;

-- Messages: only the two people on a matched request read them and write them, as themselves.
alter table public.messages enable row level security;

create policy "parties read messages" on public.messages
  for select to authenticated using ((select public.is_help_party(request_id)));

create policy "parties send messages" on public.messages
  for insert to authenticated with check (
    (select auth.uid()) = sender_id
    and (select public.is_help_party(request_id))
    and exists (select 1 from public.help_requests r where r.id = request_id and r.status = 'matched')
  );

revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;

-- Accept: atomic. The update only matches a row that is still open, and a second volunteer's update
-- waits for the first to commit, then finds it matched and changes nothing. Raises 'already_taken'
-- (the app says "Someone else already took this request"), or 'not_a_volunteer'.
create function public.accept_help_request(p_request_id uuid) returns public.help_requests
  language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  vol public.profiles;
  accepted public.help_requests;
begin
  select * into vol from public.profiles p where p.id = me and p.role = 'volunteer';
  if not found then
    raise exception 'not_a_volunteer' using errcode = '42501';
  end if;

  update public.help_requests r
     set status = 'matched',
         volunteer_id = me,
         volunteer_name = vol.first_name,
         volunteer_languages = array[vol.main_language] || array_remove(vol.languages, vol.main_language),
         volunteer_trainings = vol.trainings,
         volunteer_gender = vol.gender,
         matched_at = now()
   where r.id = p_request_id and r.status = 'open' and r.visitor_id <> me
   returning * into accepted;

  if not found then
    raise exception 'already_taken' using errcode = 'P0001';
  end if;
  return accepted;
end;
$$;

-- Close: the visitor cancels or marks help as done; the volunteer ends the chat ('done'). Does
-- nothing for a request that's already closed or isn't theirs, so a retry is harmless.
create function public.close_help_request(p_request_id uuid, p_status text) returns void
  language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if p_status not in ('cancelled', 'done') then
    raise exception 'bad_status' using errcode = '22023';
  end if;
  update public.help_requests r
     set status = p_status, closed_by = me, closed_at = now()
   where r.id = p_request_id
     and r.status in ('open', 'matched')
     and (r.visitor_id = me or (r.volunteer_id = me and r.status = 'matched' and p_status = 'done'));
end;
$$;

revoke all on function public.accept_help_request(uuid) from public;
revoke all on function public.close_help_request(uuid, text) from public;
grant execute on function public.accept_help_request(uuid) to authenticated;
grant execute on function public.close_help_request(uuid, text) to authenticated;

-- Realtime: both apps listen for request status changes and new messages (RLS still applies).
alter publication supabase_realtime add table public.help_requests, public.messages;
