-- Tighten avatar reads to the owner only.
--
-- 20261109000000_profiles.sql let any signed-in user list and download every
-- photo, which is broader than the privacy policy ("your helper sees your photo
-- only while helping you"). Now each account can read only its own folder.
-- Showing a helper's or visitor's photo during a request should go through the
-- matching function / edge function (service role), which can mint a short-lived
-- signed URL for just that person.
--
-- Photos live at <uid>/avatar-<unix ms>; the app writes a new name per upload
-- and deletes the previous file after the profile row is saved.

drop policy if exists "signed-in users read avatars" on storage.objects;

create policy "read own avatar" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
