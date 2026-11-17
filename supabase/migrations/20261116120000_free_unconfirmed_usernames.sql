-- Free usernames held by sign-ups whose email was never confirmed. Review before applying:
--   supabase db push   (or paste into the SQL editor)
--
-- With email confirmation on, someone who typo'd their email held their username forever, so
-- signing up again with the right email said "That username is taken". Now a name an unconfirmed
-- sign-up has held for over an hour counts as free: username_available says so, and the sign-up
-- trigger releases it before claiming it for the new account. Confirmed accounts keep their names.
--
-- Late confirm: if that old account confirms after all, it claims its name back when nobody else
-- took it; otherwise the stale username is dropped from its metadata, so it has no name (it can
-- still sign in by email) instead of looking like it owns one.
--
-- Safe to run more than once, and on a database that already has these function bodies:
-- everything is `create or replace` or `drop … if exists`.

create or replace function public.claim_username() returns trigger
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

-- Create Account: false when the name is taken (checked before sign-up for a clear message).
-- A name an unconfirmed sign-up has held for over an hour counts as free, as in claim_username.
create or replace function public.username_available(p_username text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1
    from public.usernames n
    join auth.users u on u.id = n.user_id
    where n.username = lower(trim(p_username))
      and (u.email_confirmed_at is not null or u.created_at >= now() - interval '1 hour')
  );
$$;

-- An account confirming its email with no claimed name but a username in its metadata lost the
-- name while unconfirmed (see the top). Claim it back if it's still free, else forget it.
create or replace function public.reclaim_username_on_confirm() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare
  wanted text := lower(trim(new.raw_user_meta_data ->> 'username'));
begin
  if wanted is null or wanted = '' or exists (select 1 from public.usernames where user_id = new.id) then
    return new;
  end if;
  if wanted ~ '^[a-z0-9_.]{3,20}$' then
    insert into public.usernames (username, user_id) values (wanted, new.id) on conflict do nothing;
    if found then return new; end if;
  end if;
  new.raw_user_meta_data := new.raw_user_meta_data - 'username';
  return new;
end;
$$;

drop trigger if exists reclaim_username_on_confirm on auth.users;
create trigger reclaim_username_on_confirm before update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.reclaim_username_on_confirm();
