import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';


import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { InstructionFooterProps } from '@/types/ui/review.types';

/**
 * Footer component that displays swipe instructions
 *
 * Note: This component has TypeScript errors related to Animated.View style prop typing.
 * These errors are related to mixing ViewStyle and TextStyle properties.
 * The component functionally works correctly, but type safety could be improved
 * by creating a proper union type or restructuring the styled components.
 */
const InstructionFooter: React.FC<InstructionFooterProps> = ({ style }) => {
  const colors = useColors();
  const { startAnimation } = useOpacityAnimation({
    initialOpacity: 0,
    delay: 0,
    duration: 300,
  });

  // Start the animation with a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      startAnimation();
    }, 500);

    return () => clearTimeout(timer);
  }, [startAnimation]);

  // Create themed styles for the icon
  const iconStyle: ViewStyle = {
    ...styles.instructionIcon,
    backgroundColor: colors.textOverlay,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOpacity: LAYOUT.OPACITY.SUBTLE,
      },
    }),
  };

  // Create themed styles for the instruction text
  const textStyle: TextStyle = styles.instructionText;

  // Use ContainerStyle type for the container
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    backgroundColor: colors.elevation1,
    opacity: 0.7,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOpacity: LAYOUT.OPACITY.SUBTLE,
      },
    }),
  };

  return (
    <View style={[styles.footer, style]}>
      <Animated.View style={containerStyle}>
        <View style={styles.instructionItem}>
          <View style={iconStyle}>
            <Ionicons color={colors.interactiveSecondary} name="arrow-back" size={18} />
          </View>
          <ThemedText style={textStyle} variant="subtle">
            Unknown
          </ThemedText>
        </View>

        <View style={[styles.instructionItem, styles.instructionItemCenter]}>
          <View style={iconStyle}>
            <Ionicons color={colors.interactiveSecondary} name="finger-print" size={18} />
          </View>
          <ThemedText style={textStyle} variant="subtle">
            Unsure
          </ThemedText>
        </View>

        <View style={[styles.instructionItem, styles.instructionItemRight]}>
          <ThemedText style={textStyle} variant="subtle">
            Known
          </ThemedText>
          <View style={iconStyle}>
            <Ionicons color={colors.interactiveSecondary} name="arrow-forward" size={18} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const ICON_SIZE = 32;

const styles = StyleSheet.create({
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? LAYOUT.SPACING.LARGE : LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginTop: 'auto',
    height: 80,
  } as ViewStyle,
  instructionIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...LAYOUT.SHADOW.SMALL,
  } as ViewStyle,
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: LAYOUT.SPACING.SMALL,
    height: 40,
    flex: 1,
  } as ViewStyle,
  instructionItemCenter: {
    justifyContent: 'center',
  } as ViewStyle,
  instructionItemRight: {
    justifyContent: 'flex-end',
  } as ViewStyle,
  instructionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.4,
    paddingTop: LAYOUT.SPACING.TINY,
  } as TextStyle,
});

export default InstructionFooter;
