import React from 'react';
import { StyleSheet } from 'react-native';
import { LAYOUT } from '../constants/layout';
import Animated, { FadeIn } from 'react-native-reanimated';

/**
 * A spacer component displayed at the bottom of scrollable content
 */
const EndMessage: React.FC = () => (
  <Animated.View style={styles.container} entering={FadeIn.duration(400).delay(800)} />
);

export default React.memo(EndMessage);

const styles = StyleSheet.create({
  container: {
    height: LAYOUT.SPACING.MEDIUM,
  },
});
