import { Ionicons } from '@expo/vector-icons';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { RetrievabilityChart } from '@/components/practice/charts/RetrievabilityChart';
import { MEMORY_CAPACITY_THRESHOLDS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

export default function MemoryRetentionModal(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();

  const { allWords: studyWords } = useFSRSQueries({
    userId: user?.id,
  });

  return (
    <ThemedView style={styles.container}>
      {/* Chart Content */}
      <View style={styles.chartContainer}>
        <RetrievabilityChart
          studyWords={studyWords ?? []}
          hideTitle={true}
          showWarningLine={true}
        />
      </View>

      {/* Educational Explanation */}
      <View style={styles.explanationContainer}>
        <ThemedText style={styles.explanationText} variant="secondary">
          {STRINGS.MEMORY_RETENTION_EXPLANATION}
        </ThemedText>

        <View style={[styles.tipContainer, { backgroundColor: colors.elevation1 }]}>
          <Ionicons name="bulb" size={16} color={colors.warning} style={styles.tipIcon} />
          <ThemedText style={styles.tipText} variant="secondary">
            {STRINGS.MEMORY_RETENTION_TIP.replace(
              '{threshold}',
              MEMORY_CAPACITY_THRESHOLDS.GOOD.toString()
            )}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  explanationContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  explanationText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
    textAlign: 'left',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  tipIcon: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.TINY,
  },
  tipText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
    textAlign: 'left',
    flex: 1,
  },
  chartContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
});
