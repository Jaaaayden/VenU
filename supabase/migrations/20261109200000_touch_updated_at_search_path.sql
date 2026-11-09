-- Pin touch_updated_at's search_path (Supabase security advisor: function_search_path_mutable).
--
-- Without it the trigger function resolves names through the caller's search_path, so a role
-- that can create objects in an earlier schema could shadow what it calls. It only uses
-- now(), which lives in pg_catalog and is always searched, so an empty path is enough.

alter function public.touch_updated_at() set search_path = '';
