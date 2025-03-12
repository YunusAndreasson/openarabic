import React, { useEffect } from 'react';
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText } from '../../components/ThemedText';
import { useColors } from '../../hooks/useColors';
import { LAYOUT } from '../../constants/layout';
import { useFadeInAnimation } from '../../hooks/animations';

interface MeaningOverlayProps {
  visible: boolean;
  meaning: string;
}

/**
 * Component that displays the meaning of a word with a fade animation
 * without changing the background brightness
 */
const MeaningOverlay: React.FC<MeaningOverlayProps> = React.memo(({ visible, meaning }) => {
  const colors = useColors();
  const { animatedStyle, startAnimation, reverseAnimation } = useFadeInAnimation(0, 150);

  useEffect(() => {
    if (visible) {
      startAnimation();
    } else {
      reverseAnimation();
    }
  }, [visible, startAnimation, reverseAnimation]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, animatedStyle]}>
      <ThemedText style={[styles.text, { color: colors.tint } as TextStyle]}>
        {meaning || 'No translation available'}
      </ThemedText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 1000,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  } as ViewStyle,
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.4,
    padding: LAYOUT.SPACING.LARGE,
  } as TextStyle,
});

export default MeaningOverlay;
