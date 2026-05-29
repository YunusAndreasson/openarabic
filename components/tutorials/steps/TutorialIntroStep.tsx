/**
 * Tutorial: Intro screen explaining the overall concept
 */

import { Ionicons } from '@/components/ui/Icon';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TUTORIAL_VISUALS } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';

export function TutorialIntroStep() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Description */}
      <View style={[styles.descriptionCard, { backgroundColor: colors.elevation1 }]}>
        <ThemedText type="body" variant="secondary" style={styles.description}>
          {STRINGS.TUTORIAL_INTRO_DESCRIPTION}
        </ThemedText>
      </View>

      {/* Icons showing swipe left/right actions */}
      <View style={styles.iconRow}>
        <View style={styles.iconItem}>
          <View style={[styles.indicator, { backgroundColor: colors.error + '20' }]}>
            <Ionicons
              name="chevron-back"
              size={TUTORIAL_VISUALS.INDICATOR_ICON_SIZE}
              color={colors.error}
            />
          </View>
        </View>

        <View style={styles.iconItem}>
          <View style={[styles.indicator, { backgroundColor: colors.success + '20' }]}>
            <Ionicons
              name="chevron-forward"
              size={TUTORIAL_VISUALS.INDICATOR_ICON_SIZE}
              color={colors.success}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

TutorialIntroStep.displayName = 'TutorialIntroStep';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  description: {
    textAlign: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.XLARGE,
  },
  iconItem: {
    alignItems: 'center',
  },
  indicator: {
    width: TUTORIAL_VISUALS.INDICATOR_SIZE,
    height: TUTORIAL_VISUALS.INDICATOR_SIZE,
    borderRadius: TUTORIAL_VISUALS.INDICATOR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
