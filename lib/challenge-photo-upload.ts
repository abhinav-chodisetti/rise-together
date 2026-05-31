import type { SupabaseClient } from '@supabase/supabase-js';

// Uploads a proof photo to the private `challenge-proofs` bucket and returns
// the storage PATH (e.g. "user_xxx/abc-1748397123.jpg"). The path is what
// gets stored in challenge_completions.photo_url. The client mints short-
// lived signed URLs for rendering via supabase.storage.createSignedUrls().
//
// Path scheme: <clerk_user_id>/<challenge_id>-<timestamp>.jpg
//   - First folder = clerk id → matches the storage INSERT policy's
//     folder-name check, so a user can only write into their own folder.
//   - Including challenge_id + timestamp keeps re-takes from clashing.
export async function uploadChallengeProof(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
  uri: string,
): Promise<string> {
  const arrayBuffer = await fetch(uri).then((r) => r.arrayBuffer());
  const path = `${userId}/${challengeId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('challenge-proofs')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
  if (error) throw new Error(error.message);
  return path;
}
