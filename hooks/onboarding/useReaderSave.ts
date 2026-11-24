import { readerSaveReceipt } from '@/services/readerSaveRpc';
import { settleReaderQuota } from '@/hooks/vocabulary/useDailyWordLimit';
import { wordSaveConfirmed } from '@/store/firstPageSlice';
import { useAppDispatch } from '@/store/hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useIsFocused } from 'expo-router';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { analytics } from '@/services/analytics';
import {
  canResumeReaderSave,
  readerSave,
  type ReaderSave,
  type SaveWord,
  type SaveMethod,
} from '@/services/readerSave';
import { keepWidgetOccurrence } from '@/services/widgets/storage';
import { saveProperties } from '@/services/readerSaveAuth';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { handleError } from '@/utils/errorHandling';
import { isNewAccount } from '@/utils/authUtils';
import { isKnownOffline } from '@/utils/network';

export const reportSaveError = (error: unknown) =>
  handleError(error, { toastMessage: STRINGS.TRACK_WORD_FAILED });
export function usePendingReaderSave() {
  const save = useSyncExternalStore(readerSave.subscribe, readerSave.snapshot);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    void readerSave.load().catch((error: unknown) => {
      setUnavailable(true);
      void reportSaveError(error);
    });
  }, []);
  return save === undefined && unavailable ? null : save;
}

export async function beginReaderSave(word: SaveWord, method: SaveMethod, owner?: string) {
  try {
    await readerSave.begin(word, method, owner);
  } catch (cause) {
    await reportSaveError(cause);
  }
}

const running = new Set<string>();
type AddWord = ReturnType<typeof useStudyWordMutations>['handleRootPress'];
export async function completeReaderSave(save: ReaderSave, owner: string, addWord: AddWord) {
  if (save.owner !== owner || save.phase !== 'ready' || running.has(save.id)) return;
  running.add(save.id);
  const lookup = () =>
    studyWordsFSRSService.getFSRSWords(owner, { rootId: save.word.rootId, limit: 1 });
  try {
    if (await isKnownOffline()) {
      await readerSave.change(save.id, old => ({
        ...old,
        phase: 'failed',
        keepReading: false,
        offline: true,
      }));
      void analytics.track(ANALYTICS_EVENTS.SAVE_INTENT_RESOLVED, {
        ...saveProperties(save),
        outcome: 'offline',
      });
      return;
    }
    const receipt = await readerSaveReceipt(owner, save.word.rootId, save.id, false);
    const resultState = { changed: receipt === 'saved' };
    if (receipt === 'missing' || (receipt === 'legacy' && !(await lookup()).length)) {
      if (readerSave.snapshot()?.id !== save.id) return;
      const result = await addWord(save.word.rootId, 'add', {
        ...(receipt === 'missing' && { readerIntent: save.id }),
        expectedOwner: owner,
        method: save.method,
        attribution: saveProperties(save),
        onConfirmed: value => {
          resultState.changed = value;
        },
      });
      // An acknowledgement may be lost or another device may have won the unique insert.
      if (!result && (receipt !== 'legacy' || !(await lookup()).length))
        throw new Error('unconfirmed');
    }
    await settleReaderQuota(save.id, resultState.changed);
    if (resultState.changed)
      void analytics.track(ANALYTICS_EVENTS.WORD_ADDED_TO_STUDY, {
        ...saveProperties(save),
        method: save.method,
        source: save.word.source,
        $insert_id: save.id + '-added',
      });
    await keepWidgetOccurrence(owner, save.word).catch(() => undefined);
    const phase = resultState.changed ? 'saved' : 'existing';
    const updated = await readerSave.change(save.id, old => ({ ...old, phase }));
    if (updated?.id === save.id)
      void analytics.track(ANALYTICS_EVENTS.SAVE_INTENT_RESOLVED, {
        ...saveProperties(save),
        outcome: phase,
      });
  } catch {
    await readerSave.change(save.id, old => ({
      ...old,
      phase: 'failed',
      keepReading: false,
      offline: false,
    }));
    void analytics.track(ANALYTICS_EVENTS.SAVE_INTENT_RESOLVED, {
      ...saveProperties(save),
      outcome: 'failed',
    });
  } finally {
    running.delete(save.id);
  }
}

export function useReaderSaveCompletion(save: ReaderSave) {
  const { session, isLoading } = useAuth();
  const dispatch = useAppDispatch();
  const focused = useIsFocused();
  const { handleRootPress } = useStudyWordMutations(undefined, {
    source: save.word.source,
    journaled: true,
  });
  const user = session?.user;
  const owner = user?.id;
  useEffect(() => {
    if (!focused || isLoading) return;
    if (owner && !canResumeReaderSave(save, owner)) {
      void readerSave.change(save.id, () => null).catch(reportSaveError);
    }
    if (!owner || owner !== save.owner) return;
    if (save.attempt && !save.verified) {
      void readerSave
        .change(save.id, old => {
          if (old.verified || old.owner !== owner) return old;
          const accountOutcome =
            user.user_metadata?.['reader_signup_intent'] === old.id
              ? 'new'
              : old.attempt?.provider === 'password' || !isNewAccount(user)
                ? 'returning'
                : 'unknown';
          void analytics.track(ANALYTICS_EVENTS.AUTH_SESSION_VERIFIED, {
            ...saveProperties(old),
            account_outcome: accountOutcome,
          });
          return { ...old, verified: true, phase: 'ready', codeAddress: undefined };
        })
        .catch(reportSaveError);
    } else if (save.phase === 'saved' || save.phase === 'existing') {
      dispatch(wordSaveConfirmed());
      if (save.keepReading) void readerSave.change(save.id, () => null).catch(reportSaveError);
    } else {
      void completeReaderSave(save, owner, handleRootPress).catch(reportSaveError);
    }
  }, [dispatch, focused, isLoading, owner, user, save, handleRootPress]);
}
