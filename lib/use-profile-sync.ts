import { useUser } from '@clerk/expo';
import { useEffect, useRef } from 'react';

import { useSupabase } from './supabase';

// Mirrors the signed-in Clerk user into the Supabase profiles table so
// queries that need a display name / avatar (e.g. leaderboards) can join
// without round-tripping to Clerk's API. Fires whenever a name/avatar
// changes and skips no-op re-renders via a fingerprint ref.
export function useProfileSync() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();
  const lastSyncedFingerprint = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Anonymous';
    const avatarUrl = user.imageUrl ?? null;
    const fingerprint = `${user.id}|${displayName}|${avatarUrl ?? ''}`;
    if (lastSyncedFingerprint.current === fingerprint) return;
    lastSyncedFingerprint.current = fingerprint;

    supabase
      .from('profiles')
      .upsert(
        {
          clerk_user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_user_id' },
      )
      .then(({ error }) => {
        if (error) {
          console.warn('[profile-sync] upsert failed:', error.message);
          lastSyncedFingerprint.current = null;
        }
      });
  }, [isLoaded, user?.id, user?.firstName, user?.lastName, user?.imageUrl, supabase]);
}
