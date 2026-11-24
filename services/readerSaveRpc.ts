import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import type { RootId } from '@/types/branded.types';
import { checkAuthentication, supabase } from './supabase';

type ReaderDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Database['public']['Functions'] & {
      save_reader_word: {
        Args: { p_root: number; p_intent: string; p_insert: boolean; p_expected_owner?: string };
        Returns: Json;
      };
    };
  };
};
const db = supabase as unknown as SupabaseClient<ReaderDatabase>;
function missingFunction(error: { code: string } | null) {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

export async function readerSaveReceipt(
  owner: string,
  root: RootId,
  intent: string,
  insert: boolean,
) {
  const { session } = await checkAuthentication(owner);
  const args = { p_root: root, p_intent: intent, p_insert: insert };
  let response = await db.rpc('save_reader_word', { ...args, p_expected_owner: owner });
  if (missingFunction(response.error)) {
    // During the owner-check migration rollout, use the live receipt writer
    // with the exact bearer already checked for this journal. The SDK can
    // otherwise select the next account's token immediately before fetch.
    response = await db
      .rpc('save_reader_word', args)
      .setHeader('Authorization', 'Bearer ' + session.access_token);
    if (missingFunction(response.error)) return 'legacy';
  }
  const { data, error } = response;
  if (error) throw error;
  const outcome =
    data && typeof data === 'object' && !Array.isArray(data) ? data['outcome'] : undefined;
  if (outcome === 'saved' || outcome === 'existing' || outcome === 'missing') return outcome;
  throw new Error('Unconfirmed reader save');
}
export async function writeReaderIntent(owner: string, root: RootId, intent: string) {
  const result = await readerSaveReceipt(owner, root, intent, true);
  if (result !== 'saved' && result !== 'existing') throw new Error('Unconfirmed reader save');
  return { changed: result === 'saved', inStudyList: true };
}
