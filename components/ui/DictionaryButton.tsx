import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { usePressAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StudyWord } from '@/types/vocabulary.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface DictionaryButtonProps {
  /** Optional custom styling */
  style?: ViewStyle;
  /** If provided, hides the button when count is 0 */
  itemCount?: number;
  /** Convenience flag to hide when empty without passing count explicitly */
  hideWhenEmpty?: boolean;
}

export default function DictionaryButton({
  style,
  itemCount,
  hideWhenEmpty,
}: DictionaryButtonProps = {}): JSX.Element | null {
  const colors = useColors();
  const { user } = useAuth();
  const { allWords } = useFSRSQueries({ userId: user?.id });
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const computedCount =
    itemCount ??
    allWords?.filter((word: StudyWord) => word != null && word.root_id != null).length ??
    0;

  if ((hideWhenEmpty || itemCount !== undefined) && computedCount <= 0) {
    return null;
  }

  const handlePress = useCallback(() => {
    router.push('/(tabs)/practice/dictionary');
  }, []);

  return (
    <AnimatedPressable
      style={[
        styles.button,
        {
          backgroundColor: colors.transparent,
        },
        animatedStyle as ViewStyle,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{ color: colors.navigationRipple, radius: MIN_TOUCH_TARGET.MEDIUM / 2 }}
    >
      <ThemedText
        type="body"
        weight="semibold"
        style={[
          styles.buttonText,
          {
            color: colors.tint,
          },
        ]}
        numberOfLines={1}
      >
        {STRINGS.DICTIONARY}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    minWidth: 70,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
  },
});

/**
 * Wrapper component specifically for the Practice tab that automatically
 * hides the Dictionary button when there are no study words
 */
export function PracticeDictionaryButton(): JSX.Element | null {
  // Deprecated wrapper left as no-op for compatibility if imported elsewhere
  return null;
}
