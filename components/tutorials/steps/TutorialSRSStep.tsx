/**
 * Tutorial: Final step - brief encouragement before starting
 */

import { Ionicons } from '@/components/ui/Icon';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { TUTORIAL_VISUALS } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';

export function TutorialSRSStep() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Sparkles icon - celebratory visual */}
      <View style={styles.iconContainer}>
        <Ionicons name="sparkles" size={TUTORIAL_VISUALS.ICON_SIZE} color={colors.tint} />
      </View>

      {/* Brief encouragement */}
      <View style={[styles.descriptionCard, { backgroundColor: colors.elevation1 }]}>
        <ThemedText type="body" variant="secondary" style={styles.description}>
          {STRINGS.TUTORIAL_SRS_DESCRIPTION}
        </ThemedText>
      </View>
    </View>
  );
}

TutorialSRSStep.displayName = 'TutorialSRSStep';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  descriptionCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  description: {
    textAlign: 'center',
  },
});
