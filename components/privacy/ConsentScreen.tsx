import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { ThemedView } from '@/components/primitives/ThemedView';
import { ConsentChoiceRows } from '@/components/privacy/ConsentChoiceRows';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useConsentPrompt } from '@/hooks/privacy/useConsentPrompt';
import { useTextLayout } from '@/hooks/ui/useTextLayout';

/**
 * The consent step, full screen over the app until a decision is made.
 *
 * The two outright answers are the same variant and size, side by side and pinned
 * below the scrolling text, so refusing is never further away or quieter than
 * allowing. Largest text sizes stack them instead of squeezing them, still equal.
 * The note that this can be changed later stays in view beside the decision.
 *
 * Insets come from the hook because this renders inside a Modal, where the native
 * SafeAreaView has no provider to measure against. The values are the same window's.
 */
export const ConsentScreen = () => {
  const insets = useSafeAreaInsets();
  const { crowded } = useTextLayout();
  const { choices, setChoice, allowBoth, refuseBoth, saveChoices } = useConsentPrompt();

  const answerStyle = crowded ? undefined : styles.answerInRow;

  return (
    <ThemedView
      useSafeArea={false}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM }}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="heading1" accessibilityRole="header">
          {STRINGS.CONSENT_TITLE}
        </ThemedText>
        <ThemedText type="body">{STRINGS.CONSENT_INTRO}</ThemedText>
        <ConsentChoiceRows choices={choices} onChange={setChoice} />
      </ScrollView>

      <View style={styles.actions}>
        <View style={crowded ? styles.answersStacked : styles.answersInRow}>
          <View style={answerStyle}>
            <ThemedButton
              fullWidth
              allowTitleWrap
              size="large"
              testID="consent-allow-both"
              title={STRINGS.CONSENT_ALLOW_BOTH}
              variant="tonal"
              onPress={allowBoth}
            />
          </View>
          <View style={answerStyle}>
            <ThemedButton
              fullWidth
              allowTitleWrap
              size="large"
              testID="consent-refuse-both"
              title={STRINGS.CONSENT_REFUSE_BOTH}
              variant="tonal"
              onPress={refuseBoth}
            />
          </View>
        </View>
        <ThemedButton
          fullWidth
          allowTitleWrap
          testID="consent-save-choices"
          title={STRINGS.CONSENT_SAVE_CHOICES}
          variant="ghost"
          onPress={saveChoices}
        />
        <ThemedText type="caption" style={styles.footnote}>
          {STRINGS.CONSENT_FOOTNOTE}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.XLARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  actions: {
    gap: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  answersInRow: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
  answersStacked: {
    gap: LAYOUT.SPACING.SMALL,
  },
  answerInRow: {
    flex: 1,
  },
  footnote: {
    textAlign: 'center',
  },
});
