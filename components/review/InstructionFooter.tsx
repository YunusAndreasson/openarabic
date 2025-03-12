import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useColors } from '../../hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../../constants/layout';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../../hooks/animations';

interface InstructionFooterProps {
  style?: ViewStyle;
}

/**
 * Footer component that displays swipe instructions
 */
const InstructionFooter: React.FC<InstructionFooterProps> = ({ style }) => {
  const colors = useColors();
  const { animatedStyle, startAnimation } = useFadeInAnimation(0, 300);

  // Start the animation with a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      startAnimation();
    }, 500);

    return () => clearTimeout(timer);
  }, [startAnimation]);

  // Create themed styles
  const themedStyles = {
    instructionIcon: {
      ...styles.instructionIcon,
      backgroundColor: `${colors.tint}08`,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOpacity: 0.1,
        },
      }),
    } as ViewStyle,
    instructionText: {
      ...styles.instructionText,
      color: colors.tabIconDefault,
    } as TextStyle,
    instructionsContainer: {
      ...styles.instructionsContainer,
      backgroundColor: `${colors.cardBackground}60`,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOpacity: 0.15,
        },
      }),
    } as ViewStyle,
  };

  return (
    <View style={[styles.footer, style]}>
      <Animated.View style={[themedStyles.instructionsContainer, animatedStyle]}>
        <View style={styles.instructionItem}>
          <View style={themedStyles.instructionIcon}>
            <Ionicons name="arrow-back" size={16} color={colors.tabIconDefault} />
          </View>
          <ThemedText style={themedStyles.instructionText}>
            Swipe left{'\n'}if you don't know
          </ThemedText>
        </View>
        <View style={styles.instructionItem}>
          <ThemedText style={themedStyles.instructionText}>Swipe right{'\n'}if you know</ThemedText>
          <View style={themedStyles.instructionIcon}>
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
});

export default InstructionFooter;
