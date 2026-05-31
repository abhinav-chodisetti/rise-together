import AsyncStorage from '@react-native-async-storage/async-storage';

// Stashed when a signed-out user taps an invite deep link, so we can bounce
// them back to /join/<id> after they sign in or up.
const KEY = 'risetogether.pendingInvite.v1';

export async function setPendingInvite(challengeId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, challengeId);
  } catch {
    // Storage failures are non-fatal; the user will just land on tabs and can
    // tap the invite link again later.
  }
}

export async function clearPendingInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

// Returns the join route if a pending invite is set (and clears it), else
// the default tabs route. Use from auth finalize handlers to bias the
// post-success destination.
export async function consumePendingInviteOrFallback(): Promise<string> {
  try {
    const id = await AsyncStorage.getItem(KEY);
    if (id) {
      await AsyncStorage.removeItem(KEY);
      return `/join/${id}`;
    }
  } catch {
    // ignore
  }
  return '/(tabs)';
}

// Read-only variant: returns the destination route without clearing storage.
// Use this when you need the destination BEFORE the auth finalize call, so
// the invite survives a finalize failure and the user can retry.
export async function peekPendingInviteOrFallback(): Promise<string> {
  try {
    const id = await AsyncStorage.getItem(KEY);
    if (id) return `/join/${id}`;
  } catch {
    // ignore
  }
  return '/(tabs)';
}
