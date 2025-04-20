/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import type { InstructionFooterProps } from '@/types/ui/review.types';

import { ThemedText } from '../../components/ThemedText';
import { LAYOUT } from '../../constants/layout';
import { useOpacityAnimation } from '../../hooks/animations';
import { useColors } from '../../hooks/useColors';

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
        shadowOpacity: 0.1,
      },
    }),
  };

  // Create themed styles for the instruction text
  const textStyle: TextStyle = {
    ...styles.instructionText,
    color: colors.tabIconDefault,
  };

  // Use ContainerStyle type for the container
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    ...LAYOUT.SHADOW.SMALL,
    backgroundColor: colors.overlay,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOpacity: 0.15,
      },
    }),
  };

  return (
    <View style={[styles.footer, style]}>
      <Animated.View style={containerStyle}>
        <View style={styles.instructionItem}>
          <View style={iconStyle}>
            <Ionicons name="arrow-back" size={18} color={colors.tabIconDefault} />
          </View>
          <ThemedText style={textStyle}>Don&apos;t know</ThemedText>
        </View>

        <View style={styles.instructionItem}>
          <View style={iconStyle}>
            <Ionicons name="finger-print" size={18} color={colors.tabIconDefault} />
          </View>
          <ThemedText style={textStyle}>Vaguely know</ThemedText>
        </View>

        <View style={[styles.instructionItem, styles.instructionItemRight]}>
          <ThemedText style={textStyle}>Know</ThemedText>
          <View style={iconStyle}>
            <Ionicons name="arrow-forward" size={18} color={colors.tabIconDefault} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

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
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...LAYOUT.SHADOW.SMALL,
  } as ViewStyle,
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.SMALL,
    height: 40,
    flex: 1,
  } as ViewStyle,
  instructionItemRight: {
    justifyContent: 'flex-end',
  } as ViewStyle,
  instructionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.4,
    opacity: LAYOUT.OPACITY.DIMMED,
    paddingTop: 2,
  } as TextStyle,
});

export default InstructionFooter;
