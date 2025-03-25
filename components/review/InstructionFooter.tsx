import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useColors } from '../../hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../../constants/layout';
import Animated from 'react-native-reanimated';
import { useOpacityAnimation } from '../../hooks/animations';
import { InstructionFooterProps } from '@/types/ui/review.types';

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
  const { animatedStyle, startAnimation } = useOpacityAnimation({
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
  const iconStyle = {
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
  const textStyle = {
    ...styles.instructionText,
    color: colors.tabIconDefault,
  };

  // Use only ViewStyle properties for the container
  const containerStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
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
      {/* @ts-ignore Type issues with Animated.View style props - functionally works correctly */}
      <Animated.View style={[containerStyle, animatedStyle]}>
        <View style={styles.instructionItem}>
          <View style={iconStyle}>
            <Ionicons name="arrow-back" size={16} color={colors.tabIconDefault} />
          </View>
          <ThemedText style={textStyle}>Swipe left{'\n'}Don't know</ThemedText>
        </View>
        <View style={styles.instructionItem}>
          <ThemedText style={textStyle}>Swipe right{'\n'}Know</ThemedText>
          <View style={iconStyle}>
            <Ionicons name="arrow-forward" size={16} color={colors.tabIconDefault} />
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
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    marginTop: 'auto',
    height: 80,
  } as ViewStyle,
  instructionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    ...LAYOUT.SHADOW.SMALL,
  } as ViewStyle,
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    height: 40,
  } as ViewStyle,
  instructionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.4,
    opacity: LAYOUT.OPACITY.DIMMED,
    paddingTop: 2,
  } as TextStyle,
  instructionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...LAYOUT.SHADOW.SMALL,
  } as ViewStyle,
  instructionContainer: {
    // Animation Adjustments:
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: Platform.OS === 'ios' ? LAYOUT.SPACING.XLARGE * 2 : LAYOUT.SPACING.MEDIUM * 2,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.LARGE,
    elevation: 10,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
    shadowOpacity: 0.1,
  },
});

export default InstructionFooter;
