import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReaderSignIn } from '@/components/auth/ReaderSignIn';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import type { PassageWord } from '@/services/firstPage';
import { BrandedBottomSheet, Icon, IconButton } from '@/components/ui';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReaderSaveCompletion, reportSaveError } from '@/hooks/onboarding/useReaderSave';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import { canResumeReaderSave, readerSave, type ReaderSave } from '@/services/readerSave';
import { saveProperties } from '@/services/readerSaveAuth';
import { startFirstReview } from '@/services/firstReview';
import { getSingleWordReviewRoute } from '@/utils/routeBuilders';

export function TrackWordSheet({
  save,
  onExit,
  word,
  onPlay,
}: {
  save: ReaderSave;
  onExit?: () => void;
  word?: PassageWord;
  onPlay?: () => void;
}) {
  const { session } = useAuth();
  const focused = useIsFocused();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  useReaderSaveCompletion(save);
  const resumable = canResumeReaderSave(save, session?.user?.id);
  const confirmed =
    !save.keepReading && resumable && (save.phase === 'saved' || save.phase === 'existing');
  const existing = save.phase === 'existing';
  const owner = session?.user?.id;
  const needsConfirmation = save.phase === 'auth' && !!owner && !save.owner;
  const auth = save.phase === 'auth' && !session;
  const title = needsConfirmation
    ? STRINGS.TRACK_THIS_WORD
    : confirmed
      ? existing
        ? STRINGS.TRACK_WORD_EXISTING
        : STRINGS.TRACK_WORD_SAVED
      : save.phase === 'failed'
        ? STRINGS.TRACK_WORD_FAILED
        : STRINGS.TRACK_WORD_SAVING;
  useEffect(() => {
    if (focused && confirmed) AccessibilityInfo.announceForAccessibility(title);
    if (focused && confirmed && !save.reviewOffered) {
      void readerSave
        .change(save.id, current => {
          if (current.reviewOffered) return current;
          void analytics.track(ANALYTICS_EVENTS.FIRST_REVIEW_OFFERED, {
            ...saveProperties(current),
            $insert_id: current.id + '-offered',
          });
          return { ...current, reviewOffered: true };
        })
        .catch(reportSaveError);
    }
  }, [confirmed, focused, title, save.id, save.reviewOffered]);
  useEffect(() => {
    if (!focused || !auth || save.shown) return;
    void readerSave
      .change(save.id, old => {
        if (old.shown) return old;
        void analytics.track(ANALYTICS_EVENTS.AUTH_SURFACE_VIEWED, saveProperties(old));
        return { ...old, shown: true };
      })
      .catch(reportSaveError);
  }, [focused, auth, save.id, save.shown]);

  async function leave(method: 'dismiss' | 'not_now' | 'keep_reading' | 'review') {
    if (method === 'review' && confirmed) await startFirstReview(save);
    const result = { dismissed: false };
    await readerSave.change(save.id, old => {
      if (method === 'review' && old.phase !== save.phase) return old;
      result.dismissed = true;
      // An accepted add still needs its durable receipt after the reader leaves.
      return old.phase === 'ready' ? { ...old, keepReading: true } : null;
    });
    if (!result.dismissed) return;
    if (auth)
      void analytics.track(ANALYTICS_EVENTS.AUTH_SURFACE_DISMISSED, {
        ...saveProperties(save),
        method,
      });
    if (method !== 'review') onExit?.();
    if (method === 'review' && confirmed) router.push(getSingleWordReviewRoute(save.word.rootId));
  }
  if (!resumable || save.keepReading) return null;
  return (
    <BrandedBottomSheet
      isVisible={focused}
      onClose={() => {
        if (focused) void leave('dismiss').catch(reportSaveError);
      }}
    >
      <BottomSheetScrollView
        accessibilityViewIsModal
        onAccessibilityEscape={() => void leave('dismiss').catch(reportSaveError)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE },
        ]}
      >
        {confirmed && (
          <View style={styles.close}>
            <IconButton
              icon="close"
              accessibilityLabel={STRINGS.FIRST_PAGE_BACK}
              onPress={() => void leave('keep_reading').catch(reportSaveError)}
            />
          </View>
        )}
        {auth ? (
          <ReaderSignIn save={save} />
        ) : (
          <>
            <ThemedText type="arabic" align="center" accessibilityLanguage="ar">
              {save.word.form}
            </ThemedText>
            <ThemedText type="heading3" align="center">
              {save.word.gloss}
            </ThemedText>
            {confirmed && onPlay && (
              <View style={styles.status}>
                <IconButton
                  icon="volume-high"
                  accessibilityLabel={STRINGS.PLAY_AUDIO}
                  onPress={onPlay}
                />
              </View>
            )}
            <View style={styles.status}>
              {confirmed && (
                <Icon
                  name="checkmark-circle"
                  color={colors.tint}
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                />
              )}
              <ThemedText type="heading3" accessibilityRole="header">
                {title}
              </ThemedText>
            </View>
            {needsConfirmation && (
              <ThemedButton
                title={STRINGS.ADD_TO_PRACTICE}
                onPress={() =>
                  void readerSave
                    .change(save.id, old =>
                      old.phase === 'auth' && !old.owner
                        ? {
                            ...old,
                            phase: 'ready',
                            owner,
                            attempt: undefined,
                            codeAddress: undefined,
                          }
                        : old,
                    )
                    .catch(reportSaveError)
                }
              />
            )}
            {confirmed && (
              <ThemedButton
                title={STRINGS.REVIEW_THIS_WORD}
                onPress={() => void leave('review').catch(reportSaveError)}
              />
            )}
            {save.phase === 'failed' && save.offline && (
              <ThemedText accessibilityRole="alert">{STRINGS.NO_INTERNET_CONNECTION}</ThemedText>
            )}
            {save.phase === 'failed' && (
              <ThemedButton
                title={STRINGS.PLEASE_TRY_AGAIN}
                onPress={() =>
                  void readerSave
                    .change(save.id, old =>
                      old.phase === 'failed' ? { ...old, phase: 'ready' } : old,
                    )
                    .catch(reportSaveError)
                }
              />
            )}
          </>
        )}
        <ThemedButton
          variant="ghost"
          title={auth ? STRINGS.READER_NOT_NOW : STRINGS.KEEP_READING}
          onPress={() => void leave(auth ? 'not_now' : 'keep_reading').catch(reportSaveError)}
        />
        {confirmed && word?.origin && (
          <View style={styles.origin}>
            <ThemedText type="label">{STRINGS.WORD_ROOT_SECTION_TITLE}</ThemedText>
            <ThemedText type="arabicCompact" accessibilityLanguage="ar">
              {word.origin.letters}
            </ThemedText>
            <ThemedText type="bodyBold">{word.origin.meaning}</ThemedText>
            <ThemedText colorName="secondaryText">{word.origin.note}</ThemedText>
          </View>
        )}
      </BottomSheetScrollView>
    </BrandedBottomSheet>
  );
}
const styles = StyleSheet.create({
  close: { alignItems: 'flex-end' },
  origin: { gap: LAYOUT.SPACING.SMALL, marginTop: LAYOUT.SPACING.LARGE },
  body: { paddingHorizontal: LAYOUT.SPACING.XLARGE, gap: LAYOUT.SPACING.MEDIUM },
  status: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
});
