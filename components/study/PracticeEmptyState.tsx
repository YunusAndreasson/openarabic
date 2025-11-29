import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAddCommonWords } from '@/hooks/study/useAddCommonWords';
import { useColors } from '@/hooks/theme/useColors';

export interface EmptyStateButtonProps {
  label: string;
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}

interface PracticeEmptyStateProps {
  onButtonPropsChange?: (props: EmptyStateButtonProps) => void;
}

/**
 * Simplified empty state for the Practice screen.
 * One-tap to add 10 essential words.
 */
export function PracticeEmptyState({ onButtonPropsChange }: PracticeEmptyStateProps) {
  const { addWords, isLoading } = useAddCommonWords();
  const colors = useColors();

  // Use ref to avoid recreating the handler and causing infinite loops
  const addWordsRef = useRef(addWords);
  addWordsRef.current = addWords;

  // Notify parent of button props - only depends on isLoading
  useEffect(() => {
    onButtonPropsChange?.({
      label: STRINGS.STUDY_LIST_EMPTY_CTA,
      onPress: () => addWordsRef.current(),
      loading: isLoading,
      disabled: false,
    });
  }, [isLoading, onButtonPropsChange]);

  return (
    <View style={styles.container}>
      {/* Empty state icon */}
      <Ionicons name="albums-outline" size={80} color={colors.textTertiary} />

      {/* Title */}
      <ThemedText type="heading3" style={styles.title}>
        {STRINGS.STUDY_LIST_EMPTY_TITLE}
      </ThemedText>

      {/* Hint */}
      <ThemedText style={styles.hint} type="caption" variant="secondary">
        {STRINGS.STUDY_LIST_EMPTY_HINT}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
  },
  hint: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  title: {
    marginTop: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
});
