-- Usernames for Create Account and Sign In (Figma Onboarding 2.0). Review before applying:
--   supabase db push   (or paste into the SQL editor)
--
-- Supabase Auth only signs in by email, so the app looks a username up first:
--   email_for_username('rosa_m') → 'rosa@example.com', then signInWithPassword(email, password).
-- The username is sent at sign-up as user metadata (options.data.username); a trigger on
-- auth.users claims it here, so a taken name fails the sign-up itself.
-- Matches src/lib/auth.ts and src/features/auth/username.ts (3-20 of a-z 0-9 _ .).
--
-- A name held by a sign-up whose email was never confirmed is freed after an hour, so someone who
-- typo'd their email can sign up again with the same username. (The old account just keeps no name.)

create table public.usernames (
  username   text primary key check (username ~ '^[a-z0-9_.]{3,20}$'),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Nobody reads or writes the table directly; the functions below are the only way in.
alter table public.usernames enable row level security;

create function public.claim_username() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  wanted text := lower(trim(new.raw_user_meta_data ->> 'username'));
begin
  if wanted is not null and wanted <> '' then
    -- Free the name if an unconfirmed sign-up has held it for over an hour (see the top).
    delete from public.usernames n
      using auth.users u
      where n.username = wanted
        and u.id = n.user_id
        and u.email_confirmed_at is null
        and u.created_at < now() - interval '1 hour';
    -- A taken or malformed name raises here, which rolls back the sign-up.
    insert into public.usernames (username, user_id) values (wanted, new.id);
  end if;
  return new;
end;
$$;

create trigger claim_username after insert on auth.users
  for each row execute function public.claim_username();

-- Sign In: the email for a username, or null. Callable signed out (anon), so it reveals whether a
-- username exists and its email; the app words "no such username" like a wrong password, but the
-- function itself doesn't hide it. Rate limiting is Supabase's API gateway's.
create function public.email_for_username(p_username text) returns text
  language sql stable security definer set search_path = '' as $$
  select u.email::text
  from public.usernames n
  join auth.users u on u.id = n.user_id
  where n.username = lower(trim(p_username));
$$;

-- Create Account: false when the name is taken (checked before sign-up for a clear message).
-- A name an unconfirmed sign-up has held for over an hour counts as free, as in claim_username.
create function public.username_available(p_username text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1
    from public.usernames n
    join auth.users u on u.id = n.user_id
    where n.username = lower(trim(p_username))
      and (u.email_confirmed_at is not null or u.created_at >= now() - interval '1 hour')
  );
$$;

revoke all on function public.email_for_username(text) from public;
revoke all on function public.username_available(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
