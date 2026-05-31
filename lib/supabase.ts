import { useSession } from '@clerk/expo';
import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env',
  );
}

// Returns a Supabase client wired to the current Clerk session. The
// accessToken callback runs on every request, so the Clerk JWT stays fresh
// and Supabase RLS sees auth.jwt() ->> 'sub' as the Clerk user id. Supabase's
// own auth machinery is disabled — Clerk owns identity.
export function useSupabase() {
  const { session } = useSession();

  return useMemo(
    () =>
      createClient(supabaseUrl!, supabaseKey!, {
        accessToken: async () => (await session?.getToken()) ?? null,
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    [session],
  );
}
