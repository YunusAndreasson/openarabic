import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedButton } from '../../components/ThemedButton';
import { useColors } from '../../hooks/useColors';
import { usePulseAnimation } from '../../hooks/animations';
import Animated from 'react-native-reanimated';
import { LAYOUT } from '../../constants/layout';
import { ReviewButtonProps } from '../../types/ui.types';

/**
 * Button for initiating a vocabulary review
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
          title={`Review ${dueWords} ${dueWords === 1 ? 'word' : ''}`}
          icon="play-circle"
          iconSize={24}
          onPress={handlePress}
          variant="filled"
          style={[styles.reviewButton, { backgroundColor: colors.tint }]}
        />
      </Animated.View>
    </View>
  );
});

/**
 * Button shown when no words are available for review
 */
const DisabledReviewButton = React.memo(() => {
  return (
    <View style={styles.reviewButtonContainer}>
      <ThemedButton
        title="No words due"
        icon="time"
        iconSize={24}
        onPress={() => {}}
        variant="outlined"
        style={styles.reviewButton}
        disabled
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
  },
});

ReviewButton.displayName = 'ReviewButton';
DisabledReviewButton.displayName = 'DisabledReviewButton';

export { ReviewButton, DisabledReviewButton };
