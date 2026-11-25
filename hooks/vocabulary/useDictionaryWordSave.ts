import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';

import { useToast } from '@/components/providers';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import {
  beginReaderSave,
  reportSaveError,
  usePendingReaderSave,
} from '@/hooks/onboarding/useReaderSave';
import { canResumeReaderSave, readerSave } from '@/services/readerSave';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';

export function useDictionaryWordSave(rootId: RootId, enabled: boolean) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const focused = useIsFocused();
  const pending = usePendingReaderSave();
  const save =
    enabled &&
    pending?.word.source === 'dictionary' &&
    pending.word.rootId === rootId &&
    canResumeReaderSave(pending, user?.id)
      ? pending
      : null;
  const complete = save?.phase === 'saved' || save?.phase === 'existing';

  useEffect(() => {
    if (!focused || !complete || save.owner !== user?.id) return;
    void readerSave
      .change(save.id, old => {
        showToast(old.phase === 'saved' ? STRINGS.TRACK_WORD_SAVED : STRINGS.TRACK_WORD_EXISTING);
        return null;
      })
      .catch(reportSaveError);
  }, [complete, focused, save, showToast, user?.id]);

  return {
    save,
    addToPractice: (entry: Tables<'roots'>) =>
      void beginReaderSave(
        { source: 'dictionary', rootId, form: entry.letters, gloss: entry.meaning },
        'sheet',
        user?.id,
      ),
  };
}
