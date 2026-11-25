import type * as IOSWord from '@/widgets/WordInContext.ios';
import type * as IOSPublic from '@/widgets/OpenText.ios';
import type * as AndroidWord from '@/widgets/WordInContext.android';
import { Platform } from 'react-native';
import type { StudyWord } from '@/types/vocabulary.types';
import { createSerialQueue } from '@/utils/createSerialQueue';
import { readSmartReminderPrefs } from '@/utils/smartReminderPrefs';
import { widgetBridge } from './native';
import { lastCheckedFace, publicRotation, publicTimeline, wordTimeline } from './plan';
import { readOccurrences, readWidgetCopy, storeWidgetCopy } from './storage';
import type { WordEntry, WordFace } from '@/widgets/edition';

const queue = createSerialQueue();
let owner: string | undefined;
let generation = '';
let revision = 0;
let signature = '';
let preview: WordFace | undefined;
export const widgetPreview = () => preview;
export const currentWidgetRevision = () => revision;
let firstUse = Date.now();
export function widgetGradeSubmitted(expected: string) {
  invalidateWordWidget(expected, firstUse, 'Checking');
}
// A still-mounted reader or a headless sync can see the prior session until
// Supabase publishes SIGNED_OUT. Only auth can release this fence.
let revocation: { owner: string } | undefined;
export function restoreWidgetSession(authenticatedOwner: string) {
  if (revocation?.owner === authenticatedOwner) revocation = undefined;
  widgetBridge?.setOwner(authenticatedOwner);
}
export function clearWordWidget(leaving = owner, stage: 'revoke' | 'publish' = 'publish') {
  const pending = leaving ? { owner: leaving } : undefined;
  if (pending) revocation = pending;
  setWidgetOwner('', firstUse, stage);
  return () => {
    if (revocation === pending) revocation = undefined;
  };
}

// Expo's native widget bridge accepts JSON values. An optional property
// explicitly set to undefined anywhere in the snapshot rejects the entire write.
function nativeFace(face: WordFace): WordFace {
  return JSON.parse(JSON.stringify(face)) as WordFace;
}

function write(entries: WordEntry[], open: WordEntry[], installed: number) {
  const now = open[0]?.date ?? new Date();
  const next = JSON.stringify([
    entries.map((e, i) => [i ? +e.date : 0, e.props]),
    open.map((e, i) => [i ? +e.date : 0, e.props]),
    now.getTimezoneOffset(),
    installed,
  ]);
  if (next === signature) return;
  if (Platform.OS === 'ios') {
    const { wordWidget } = require('@/widgets/WordInContext.ios') as typeof IOSWord;
    const { publicWidget } = require('@/widgets/OpenText.ios') as typeof IOSPublic;
    wordWidget.updateTimeline(entries.map(e => ({ date: e.date, props: nativeFace(e.props) })));
    publicWidget.updateTimeline(open.map(e => ({ date: e.date, props: nativeFace(e.props) })));
  } else if (Platform.OS === 'android') {
    const { wordWidget } = require('@/widgets/WordInContext.android') as typeof AndroidWord;
    if (entries[0])
      wordWidget.updateSnapshot({
        ...nativeFace(entries[0].props),
        frames: entries.map(e => ({ at: +e.date, face: nativeFace(e.props) })),
        publicRotation: { firstUse: installed, faces: publicRotation().map(nativeFace) },
      });
  }
  signature = next;
  preview = entries[0]?.props;
}
export function widgetOwner(next: string, installed: number) {
  setWidgetOwner(next, installed, 'sync');
}

function setWidgetOwner(next: string, installed: number, stage: 'sync' | 'revoke' | 'publish') {
  if (!widgetBridge) return;
  if (next && next === revocation?.owner) next = '';
  firstUse = installed;
  function writePublic() {
    const open = publicTimeline(Date.now(), installed);
    write(open, open, installed);
  }
  if (stage === 'sync' && owner === next) {
    if (!next) writePublic();
    return;
  }
  generation = widgetBridge.setOwner(next);
  owner = next;
  revision++;
  signature = '';
  preview = undefined;
  if (stage === 'revoke') return;
  if (next) {
    writePublic();
    return;
  }
  // Revocation is already durable. WidgetKit or the launcher can be briefly
  // unavailable. Retry independently; the next sync retries a persistent failure.
  try {
    writePublic();
  } catch {
    const version = revision;
    void Promise.resolve()
      .then(() => {
        if (revision === version && owner === '' && !signature) writePublic();
      })
      .catch(() => undefined);
  }
}
export function invalidateWordWidget(
  expected: string,
  installed: number,
  status: 'Checking' | 'Offline copy' | 'Sync failed',
) {
  if (!widgetBridge || owner !== expected) return;
  const version = ++revision;
  const open = publicTimeline(Date.now(), installed);
  if (!preview?.generation || preview.generation !== generation) {
    write(open, open, installed);
    if (status !== 'Checking')
      void readWidgetCopy(expected)
        .then(copy => {
          if (
            owner === expected &&
            version === revision &&
            copy?.generation === generation &&
            copy.checked
          )
            write([{ date: new Date(), props: lastCheckedFace(copy, status) }], open, installed);
        })
        .catch(() => undefined);
    return;
  }
  write([{ date: new Date(), props: lastCheckedFace(preview, status) }], open, installed);
}
// An independent headless JS runtime may still see the departing session.
// It may refresh an existing native generation, but only the foreground auth
// lifecycle can claim a new one.
export async function resumeWidgetGeneration(expected: string, version: number) {
  const token =
    owner === expected && generation ? generation : (await readWidgetCopy(expected))?.generation;
  if (
    version !== revision ||
    revocation?.owner === expected ||
    !token ||
    !widgetBridge?.matchesOwner(expected, token)
  )
    return false;
  if (owner !== expected || generation !== token) {
    owner = expected;
    generation = token;
    revision++;
    signature = '';
    preview = undefined;
  }
  return true;
}

export function publishDeck(
  expected: string,
  words: StudyWord[],
  checked: number,
  installed: number,
  lastCompletedAt?: number,
) {
  if (!widgetBridge || owner !== expected || !generation) return Promise.resolve();
  const version = ++revision;
  return queue(async () => {
    const [occurrences, mirror] = await Promise.all([
      readOccurrences(expected),
      readSmartReminderPrefs(),
    ]);
    if (version !== revision || owner !== expected) return;
    const now = Date.now();
    const entries = wordTimeline(
      {
        words,
        checked,
        occurrences,
        lastCompletedAt:
          lastCompletedAt ?? (mirror?.owner === owner ? mirror.lastSessionCompletedAt : undefined),
      },
      generation,
      now,
      installed,
    );
    write(entries, publicTimeline(now, installed), installed);
    await storeWidgetCopy(expected, entries[0]?.props);
  });
}
