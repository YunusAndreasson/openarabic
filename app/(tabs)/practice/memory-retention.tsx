import { Ionicons } from '@expo/vector-icons';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { RetrievabilityChart } from '@/components/practice/charts/RetrievabilityChart';
import { LAYOUT } from '@/constants/layout';
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
        <RetrievabilityChart studyWords={studyWords ?? []} hideTitle={true} />
      </View>

      {/* Educational Explanation */}
      <View style={styles.explanationContainer}>
        <ThemedText style={styles.explanationText} variant="secondary">
          Memory capacity shows your retention percentage. At 100%, you can recall all vocabulary
          words.
        </ThemedText>

        <View style={[styles.tipContainer, { backgroundColor: colors.elevation1 }]}>
          <Ionicons name="bulb" size={16} color={colors.tint} style={styles.tipIcon} />
          <ThemedText style={styles.tipText} variant="secondary">
            If capacity drops below 70%, practice existing words before adding new ones to maintain
            retention.
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
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  explanationText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
    textAlign: 'left',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  tipIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
    marginTop: 2,
  },
  tipText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.4,
    textAlign: 'left',
    flex: 1,
  },
  chartContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.TINY,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
});
