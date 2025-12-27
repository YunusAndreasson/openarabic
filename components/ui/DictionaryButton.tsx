import { router } from 'expo-router';
import type { JSX } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { UiAction } from '@/types/enums';

interface DictionaryButtonProps {
  hideWhenEmpty?: boolean;
  itemCount?: number;
}

export function DictionaryButton(props: DictionaryButtonProps): JSX.Element | null {
  const { hideWhenEmpty = true, itemCount } = props;
  const colors = useColors();
  const { session } = useAuth();

  // Get study words count to determine if button should be shown
  const { allWords, dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const studyWordsCount = (allWords?.length ?? 0) + (dueWords?.length ?? 0);
  const effectiveCount = itemCount ?? studyWordsCount;

  const handlePressAction = (): void => {
    router.push(ROUTE_PATHS.STUDY_DICTIONARY);
  };

  // Use shared button press hook
  const { handlePress, rippleConfig } = useButtonPress({
    onPress: handlePressAction,
  });

  // Hide button when hideWhenEmpty is true and there are no study words
  if (hideWhenEmpty && (effectiveCount ?? 0) <= 0) {
    return null;
  }

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: colors.transparent,
        },
      ]}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      onPress={handlePress}
      android_ripple={rippleConfig}
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
        {UiAction.ALL_WORDS}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    minWidth: 70,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
  },
});
