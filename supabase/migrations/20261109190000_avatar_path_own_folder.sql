-- A profile's photo must live in its owner's own folder.
--
-- Users can write avatar_path (column grant) and RLS only checks the row id, so without
-- this a user could set avatar_path = '<someone-else's uid>/avatar-123'. Anything that
-- later mints a signed URL for "this profile's photo" with the service role (e.g. the
-- matching function showing a helper's photo) would then serve another person's private
-- photo. The app writes '<uid>/avatar-<unix ms>'; this allows any single file name in the
-- owner's folder (no sub-folders, no '..').

alter table public.profiles
  add constraint avatar_path_own_folder
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9._-]+$') and position('..' in avatar_path) = 0);
