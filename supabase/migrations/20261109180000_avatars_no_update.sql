-- Drop the storage UPDATE policy for avatars.
--
-- The app now writes every photo to a fresh path (<uid>/avatar-<unix ms>) and never
-- overwrites an existing file, so uploads don't use upsert and users never need UPDATE
-- on storage.objects. Removing it means a client bug can't silently replace the live
-- photo. Insert, select (owner only) and delete policies stay.

drop policy if exists "replace own avatar" on storage.objects;
