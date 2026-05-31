/**
 * Post-grade voice result, shown only when a spoken answer was *wrong* — a
 * correct answer just proceeds. Lets the learner see what the recognizer heard
 * and recover from a mishear instead of silently losing the card.
 *
 * A full card shows the heard word + the answer, with three actions: "I knew
 * it" (accept → Known), "Didn't know" (→ Unknown) and "Retry" (re-record).
 * `result.suggestion` emphasises the likely choice.
 *
 * Mirrors VoiceStatusIndicator's reanimated FadeIn + theme-token styling so the
 * two read as one cohesive voice surface.
 */
import { memo, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Ionicons, type IoniconName } from '@/components/ui/Icon';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { VoiceResult } from '@/hooks/review/useVoiceReview';
import { useColors } from '@/hooks/theme/useColors';
import { withAlpha } from '@/utils/colorUtils';
import { lightFeedback, selectionFeedback } from '@/utils/haptics';

const ICON_SIZE = LAYOUT.BUTTON.ICON_SIZE.MEDIUM;

interface VoiceResultPanelProps {
  result: VoiceResult;
  /** The spoken answer was right → mark Known. */
  onAccept: () => void;
  /** The learner didn't know it → mark Unknown. */
  onReject: () => void;
  /** Re-open the mic for another attempt on the same card. */
  onRetry: () => void;
}

export const VoiceResultPanel: FC<VoiceResultPanelProps> = memo(
  ({ result, onAccept, onReject, onRetry }) => {
    const colors = useColors();
    const heardSomething = result.heard.length > 0;

    return (
      <Animated.View
        entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow },
        ]}
      >
        <View style={styles.header}>
          <Ionicons
            name={heardSomething ? 'alert-circle' : 'mic-off'}
            size={ICON_SIZE}
            color={heardSomething ? colors.warning : colors.secondaryText}
          />
          <ThemedText type="label" colorName={heardSomething ? 'warning' : 'secondaryText'}>
            {heardSomething ? STRINGS.VOICE_RESULT_NOT_QUITE : STRINGS.VOICE_RESULT_NOT_HEARD}
          </ThemedText>
        </View>

        <View style={styles.detail}>
          <ThemedText type="caption" colorName="textTertiary" style={styles.detailLabel}>
            {STRINGS.VOICE_RESULT_HEARD_LABEL}
          </ThemedText>
          <ThemedText
            type="body"
            weight="semibold"
            colorName={heardSomething ? 'text' : 'textTertiary'}
            numberOfLines={1}
            style={styles.detailValue}
          >
            {heardSomething ? `“${result.heard}”` : STRINGS.VOICE_RESULT_SILENCE}
          </ThemedText>
        </View>

        <View style={styles.detail}>
          <ThemedText type="caption" colorName="textTertiary" style={styles.detailLabel}>
            {STRINGS.VOICE_RESULT_ANSWER_LABEL}
          </ThemedText>
          <ThemedText
            type="body"
            weight="semibold"
            colorName="success"
            numberOfLines={1}
            style={styles.detailValue}
          >
            {result.expected}
          </ThemedText>
        </View>

        <View style={styles.actionsRow}>
          <ActionButton
            label={STRINGS.VOICE_RESULT_REJECT}
            icon="close"
            color={colors.error}
            emphasized={result.suggestion === 'unknown'}
            onPress={() => {
              lightFeedback();
              onReject();
            }}
          />
          <ActionButton
            label={STRINGS.VOICE_RESULT_ACCEPT}
            icon="checkmark"
            color={colors.success}
            emphasized={result.suggestion === null}
            onPress={() => {
              selectionFeedback();
              onAccept();
            }}
          />
        </View>

        <ActionButton
          label={STRINGS.VOICE_RESULT_RETRY}
          icon="refresh"
          color={colors.tint}
          emphasized={result.suggestion === 'retry'}
          fullWidth
          onPress={() => {
            selectionFeedback();
            onRetry();
          }}
        />
      </Animated.View>
    );
  },
);

VoiceResultPanel.displayName = 'VoiceResultPanel';

const ActionButton: FC<{
  label: string;
  icon: IoniconName;
  color: string;
  emphasized: boolean;
  fullWidth?: boolean;
  onPress: () => void;
}> = ({ label, icon, color, emphasized, fullWidth = false, onPress }) => {
  const bgOpacity = emphasized ? LAYOUT.OPACITY.SUBTLE : LAYOUT.OPACITY.FAINT;
  const borderOpacity = emphasized ? LAYOUT.OPACITY.FULL : LAYOUT.OPACITY.LIGHT;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={LAYOUT.HIT_SLOP.SMALL}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        fullWidth ? styles.actionFull : styles.actionFlex,
        {
          backgroundColor: withAlpha(color, pressed ? LAYOUT.OPACITY.SUBTLE : bgOpacity),
          borderColor: withAlpha(color, borderOpacity),
        },
      ]}
    >
      <Ionicons name={icon} size={ICON_SIZE} color={color} />
      <ThemedText skipDefaultColor weight="semibold" style={[styles.actionLabel, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    gap: LAYOUT.SPACING.MEDIUM,
    ...LAYOUT.ELEVATION.FLOATING,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  detailLabel: {
    width: 64,
  },
  detailValue: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.TINY,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: LAYOUT.BUTTON.HEIGHT.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.SMALL,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  actionFlex: {
    flex: 1,
  },
  actionFull: {
    width: '100%',
  },
  actionLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
});
