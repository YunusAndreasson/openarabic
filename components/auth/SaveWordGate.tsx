import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountGateActions } from '@/components/auth/PracticeGate';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { BrandedBottomSheet } from '@/components/ui';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { saveProperties } from '@/services/readerSaveAuth';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useReaderSaveCompletion, reportSaveError } from '@/hooks/onboarding/useReaderSave';
import { useAuth } from '@/hooks/auth/useAuth';
import { readerSave, type ReaderSave } from '@/services/readerSave';

export function SaveWordGate({ save, onExit }: { save: ReaderSave; onExit?: () => void }) {
  useReaderSaveCompletion(save);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const choosingAccount = save.phase === 'auth' && !user;
  useEffect(() => {
    if (!focused || !choosingAccount || save.shown) return;
    void readerSave
      .change(save.id, old => {
        if (old.shown) return old;
        void analytics.track(ANALYTICS_EVENTS.AUTH_SURFACE_VIEWED, saveProperties(old));
        return { ...old, shown: true };
      })
      .catch(reportSaveError);
  }, [choosingAccount, focused, save.id, save.shown]);

  function dismiss() {
    void readerSave
      .change(save.id, old => (old.phase === 'ready' ? { ...old, keepReading: true } : null))
      .then(onExit)
      .catch(reportSaveError);
  }

  const unclaimed = save.phase === 'auth' && !!user && !save.owner;
  const waiting = save.phase === 'ready' || (save.phase === 'auth' && !!save.owner);
  // The sheet's Android back listener must stand down while auth owns the screen.
  if (!focused || save.keepReading || save.phase === 'saved' || save.phase === 'existing')
    return null;

  return (
    <BrandedBottomSheet isVisible onClose={dismiss}>
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: LAYOUT.SPACING.XLARGE + insets.bottom },
        ]}
      >
        <ThemedText type="heading2" accessibilityRole="header">
          {choosingAccount || unclaimed
            ? STRINGS.PRACTICE_GATE_WORD
            : waiting
              ? STRINGS.TRACK_WORD_SAVING
              : save.refusal?.reason === 'due-backlog'
                ? STRINGS.PRACTICE_GATE_BACKLOG
                : STRINGS.TRACK_WORD_FAILED}
        </ThemedText>
        <ThemedText type="arabic" align="center">
          {save.word.form}
        </ThemedText>
        <ThemedText colorName="secondaryText" align="center">
          {save.word.gloss}
        </ThemedText>
        {choosingAccount && (
          <>
            <ThemedText>{STRINGS.TRACK_WORD_BENEFIT}</ThemedText>
            <AccountGateActions saveIntent={save.id} />
          </>
        )}
        {unclaimed && (
          <ThemedButton
            fullWidth
            allowTitleWrap
            title={STRINGS.ADD_TO_PRACTICE}
            onPress={() => {
              void readerSave
                .change(save.id, old => ({ ...old, owner: user.id, phase: 'ready' }))
                .catch(reportSaveError);
            }}
          />
        )}
        {save.refusal && <ThemedText colorName="secondaryText">{save.refusal.message}</ThemedText>}
        {save.refusal?.reason === 'due-backlog' && (
          <ThemedButton
            fullWidth
            allowTitleWrap
            title={STRINGS.PRACTICE_GATE_OPEN}
            onPress={() => {
              dismiss();
              router.navigate(ROUTE_PATHS.PRACTICE_TAB);
            }}
          />
        )}
        {save.phase === 'failed' && !save.refusal && (
          <ThemedButton
            fullWidth
            allowTitleWrap
            title={STRINGS.RETRY}
            onPress={() => {
              void readerSave
                .change(save.id, old => ({ ...old, phase: 'ready' }))
                .catch(reportSaveError);
            }}
          />
        )}
        <ThemedButton
          fullWidth
          allowTitleWrap
          variant="ghost"
          title={STRINGS.KEEP_READING}
          onPress={dismiss}
        />
      </BottomSheetScrollView>
    </BrandedBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
});
