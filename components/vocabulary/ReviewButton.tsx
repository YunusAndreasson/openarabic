import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedButton } from '../../components/ThemedButton';
import { useColors } from '../../hooks/useColors';
import { usePulseAnimation } from '../../hooks/animations';
import Animated from 'react-native-reanimated';
import { LAYOUT } from '../../constants/layout';
import { ReviewButtonProps } from '../../types/ui.types';

/**
 * Review button component
 */
const ReviewButton = React.memo(({ dueWords, onPress }: ReviewButtonProps) => {
  const colors = useColors();
  // Use the existing pulse animation hook
  const { pulse, animatedStyle } = usePulseAnimation({
    pulseMagnitude: 1.05,
    style: 'standard',
  });

  const handlePress = useCallback(() => {
    // Trigger the pulse animation
    pulse();

    // Call onPress after a short delay to allow the animation to be visible
    setTimeout(() => {
      onPress();
    }, 150);
  }, [pulse, onPress]);

  return (
    <View style={styles.reviewButtonContainer}>
      <Animated.View style={animatedStyle as any}>
        <ThemedButton
          title={`Review ${dueWords} ${dueWords === 1 ? 'Word' : 'Words'}`}
          onPress={handlePress}
          variant="filled"
          style={[styles.reviewButton, { backgroundColor: colors.tint }]}
          accessibilityLabel={`Review ${dueWords} words`}
        />
      </Animated.View>
    </View>
  );
});

/**
 * Disabled review button
 */
const DisabledReviewButton = React.memo(() => {
  const colors = useColors();

  return (
    <View style={styles.reviewButtonContainer}>
      <ThemedButton
        title="No words due"
        onPress={() => {}}
        variant="outlined"
        style={[styles.reviewButton, { borderColor: colors.cardBorder }]}
        disabled
        accessibilityLabel="No words due"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  reviewButtonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  reviewButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    width: '100%',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    ...LAYOUT.SHADOW.SMALL,
  },
});

ReviewButton.displayName = 'ReviewButton';
DisabledReviewButton.displayName = 'DisabledReviewButton';

export { ReviewButton, DisabledReviewButton };
