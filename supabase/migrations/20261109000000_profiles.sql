-- Profiles for visitors and volunteers, plus the private avatars bucket.
-- Matches src/features/profile/mapping.ts (ProfileRow). Review before applying:
--   supabase db push   (or paste into the SQL editor)

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  role                text not null check (role in ('visitor', 'volunteer')),
  first_name          text not null check (char_length(first_name) between 1 and 40),
  avatar_path         text,
  languages           text[] not null check (cardinality(languages) >= 1),
  main_language       text not null,
  app_language        text not null default 'en',

  -- visitor
  access_needs        text[] not null default '{}'
                      check (access_needs <@ array['wheelchair','hard_of_hearing','low_vision','walking_aid','other']),
  access_needs_note   text check (char_length(access_needs_note) <= 200),
  communication       text[] not null default '{}'
                      check (communication <@ array['speaking','text','sign_language']),
  helper_gender_pref  text not null default 'none' check (helper_gender_pref in ('none','woman','man')),
  helper_age_pref     text not null default 'any'  check (helper_age_pref in ('any','under_40','40_plus')),

  -- volunteer
  trainings           text[] not null default '{}'
                      check (trainings <@ array['wheelchair','asl','first_aid','sighted_guide','mental_health']),
  gender              text check (gender in ('woman','man','nonbinary','prefer_not')),
  age_band            text check (age_band in ('under_40','40_plus','prefer_not')),
  verified            boolean not null default false, -- set by LA28 staff (service role) only

  privacy_version     text not null,
  privacy_accepted_at timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint main_language_listed check (main_language = any (languages)),
  constraint volunteer_fields check (role = 'visitor' or (gender is not null and age_band is not null))
);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Row-level security: each account reads and writes only its own row.
-- Matching (other people's rows) should go through a security-definer function
-- or edge function that returns only the fields in the privacy policy.
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id and verified = false);

create policy "update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "delete own profile" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- Column-level: users can't change role or verified after the row exists.
revoke update on public.profiles from authenticated, anon;
grant update (
  first_name, avatar_path, languages, main_language, app_language,
  access_needs, access_needs_note, communication, helper_gender_pref, helper_age_pref,
  trainings, gender, age_band, privacy_version, privacy_accepted_at
) on public.profiles to authenticated;

-- Avatars: private bucket, files at <uid>/avatar.<ext>, read through signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "signed-in users read avatars" on storage.objects
  for select to authenticated using (bucket_id = 'avatars');

create policy "upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "replace own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
