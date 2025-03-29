import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AnimatedItemProps } from '@/types/ui/layout.types';
import { LAYOUT } from '@/constants/layout';
import SectionTitle from './SectionTitle';

/**
 * A reusable animated item component that fades in with configurable timing.
 *
 * This is a multi-purpose animation component that can be used for:
 * - Simple items that need to animate in (default behavior)
 * - Full width containers (when fullWidth is true - replacing EntranceAnimation)
 * - Section containers with titles (when title is provided - replacing AnimatedSection)
 */
const styles = StyleSheet.create({
  fullWidth: {
    flex: 1,
    width: '100%',
  },
  paddedContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
});

const AnimatedItem = React.memo(
  ({
    children,
    delay = 0,
    style,
    fullWidth = false,
    title,
    showTitle = true,
    paddingHorizontal = false,
  }: AnimatedItemProps & {
    fullWidth?: boolean;
    title?: string;
    showTitle?: boolean;
    paddingHorizontal?: boolean;
  }) => {
    // Create a custom entry animation with configured delay and duration
    const entering = FadeIn.delay(delay).duration(300);

    return (
      <Animated.View style={[fullWidth && styles.fullWidth, style]} entering={entering}>
        {showTitle && title && <SectionTitle title={title} />}
        {paddingHorizontal ? <View style={styles.paddedContent}>{children}</View> : children}
      </Animated.View>
    );
  }
);

AnimatedItem.displayName = 'AnimatedItem';

export default AnimatedItem;
