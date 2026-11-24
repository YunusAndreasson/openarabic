import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { readerSave, type ReaderSave, type SaveProvider } from '@/services/readerSave';
import { withReaderExchange, type ExchangeFields } from '@/services/readerAuthExchange';

export const saveProperties = (save: ReaderSave) => ({
  placement: 'add_to_practice',
  platform: Platform.OS,
  sheet_id: save.id,
  attempt_id: save.attempt?.id,
  provider: save.attempt?.provider ?? (save.owner ? 'signed_in' : 'none'),
  source: save.word.source,
});

export type StartReaderAuth = (provider: SaveProvider) => Promise<ReaderAuthAttempt | undefined>;
export interface ReaderAuthAttempt {
  id: string;
  properties: Record<string, string | undefined>;
  verifiedHeader?: (outcome: 'returning' | 'unknown') => void;
  exchange<T>(fields: ExchangeFields, fn: () => Promise<T>): Promise<T>;
  end(outcome: 'cancelled' | 'failed', stage: string): void;
}

export function resumeReaderAttempt(save: ReaderSave): ReaderAuthAttempt | undefined {
  const attemptId = save.attempt?.id;
  if (!attemptId) return;
  return {
    id: attemptId,
    properties: saveProperties(save),
    exchange: (fields, run) =>
      withReaderExchange(
        fields,
        async owner => {
          await readerSave.change(save.id, current =>
            current.phase === 'auth' &&
            (!current.owner || current.owner === owner) &&
            current.attempt?.id === attemptId
              ? { ...current, owner }
              : current,
          );
        },
        run,
      ),
    end(outcome, stage) {
      if (outcome === 'cancelled')
        void readerSave
          .change(save.id, old =>
            old.phase === 'auth' && old.attempt?.id === attemptId
              ? { ...old, attempt: undefined }
              : old,
          )
          .catch(() => {
            /* The cancelled SDK call has already settled. */
          });
      void analytics.track(
        outcome === 'cancelled'
          ? ANALYTICS_EVENTS.AUTH_ATTEMPT_CANCELLED
          : ANALYTICS_EVENTS.AUTH_ATTEMPT_FAILED,
        {
          ...saveProperties(save),
          stage,
        },
      );
    },
  };
}

export async function startReaderAttempt(sheetId: string, provider: SaveProvider) {
  const id = randomUUID();
  const save = await readerSave.change(sheetId, current =>
    current.phase === 'auth'
      ? { ...current, attempt: { id, provider }, codeAddress: undefined }
      : current,
  );
  if (save?.attempt?.id !== id) return;
  void analytics.track(ANALYTICS_EVENTS.AUTH_METHOD_ATTEMPTED, saveProperties(save));
  return resumeReaderAttempt(save);
}

/** Voluntary sign-in has its own attribution and cannot claim a reader save. */
export function openReaderHeaderAuth() {
  const surface = { placement: 'reader_header', platform: Platform.OS, sheet_id: randomUUID() };
  void analytics.track(ANALYTICS_EVENTS.AUTH_SURFACE_VIEWED, surface);
  let current: ReaderAuthAttempt | undefined;
  let closed = false;
  const start: StartReaderAuth = async provider => {
    if (closed) return undefined;
    const id = randomUUID();
    const properties = { ...surface, attempt_id: id, provider };
    void analytics.track(ANALYTICS_EVENTS.AUTH_METHOD_ATTEMPTED, properties);
    current = {
      id,
      properties,
      exchange: (_fields, run) => run(),
      end(outcome, stage) {
        void analytics.track(
          outcome === 'cancelled'
            ? ANALYTICS_EVENTS.AUTH_ATTEMPT_CANCELLED
            : ANALYTICS_EVENTS.AUTH_ATTEMPT_FAILED,
          { ...properties, stage },
        );
      },
      verifiedHeader(account_outcome) {
        if (closed || current?.id !== id) return;
        closed = true;
        void analytics.track(ANALYTICS_EVENTS.AUTH_SESSION_VERIFIED, {
          ...properties,
          account_outcome,
        });
      },
    };
    return current;
  };
  return {
    start,
    dismiss() {
      if (closed) return;
      closed = true;
      void analytics.track(ANALYTICS_EVENTS.AUTH_SURFACE_DISMISSED, current?.properties ?? surface);
    },
  };
}

export function trackReaderAccount(method: string, created: boolean, attempt?: ReaderAuthAttempt) {
  const track = created ? analytics.trackSignUp : analytics.trackSignIn;
  return attempt ? track(method, attempt.properties) : track(method);
}
