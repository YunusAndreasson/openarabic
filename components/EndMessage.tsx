import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { LAYOUT } from '../constants/layout';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../utils/animations';

/**
 * A spacer component displayed at the bottom of scrollable content
 */
const EndMessage: React.FC = () => {
  const { animatedStyle, startAnimation } = useFadeInAnimation(800, 400);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  return <Animated.View style={[styles.container, animatedStyle]} />;
};

export default React.memo(EndMessage);

const styles = StyleSheet.create({
  container: {
    height: LAYOUT.SPACING.MEDIUM,
  },
});
