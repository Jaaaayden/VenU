// The one VolunteerBackend the app uses, shared by the visitor's request store and the volunteer's
// desk: live help requests and chat on Supabase when the app has a project (real or the local mock
// server), else the on-device mock with Daniel (local mode).
import { supabase } from '@/lib/supabase';

import { createMockBackend, type VolunteerBackend } from './backend';
import { createSupabaseBackend } from './supabase-backend';

export const appBackend: VolunteerBackend = supabase ? createSupabaseBackend(supabase) : createMockBackend();
