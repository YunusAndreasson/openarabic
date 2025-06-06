import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

export type BottomControlsProps = {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryVariant?: 'filled' | 'outlined';
  primaryDisabled?: boolean;
  primaryAccessibilityLabel?: string;
  primaryDisablePressAnimation?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  secondaryVariant?: 'filled' | 'outlined';
  secondaryDisabled?: boolean;
  secondaryAccessibilityLabel?: string;
  // Timer button props
  showTimerButton?: boolean;
  onTimerPress?: () => void;
  isTimerActive?: boolean;
  timerAccessibilityLabel?: string;
};

/* eslint-disable react/prop-types */
const BottomControls = memo<BottomControlsProps>(
  ({
    primaryLabel,
    onPrimaryPress,
    primaryVariant = 'filled',
    primaryDisabled = false,
    primaryAccessibilityLabel,
    primaryDisablePressAnimation,
    secondaryLabel,
    onSecondaryPress,
    secondaryVariant = 'outlined',
    secondaryDisabled = false,
    secondaryAccessibilityLabel,
    showTimerButton = false,
    onTimerPress,
    isTimerActive = false,
    timerAccessibilityLabel,
  }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    // Optimize gradient colors calculation
    const gradientColors = [
      colors.transparent,
      `${colors.background}40`,
      `${colors.background}80`,
      colors.background,
      colors.background,
    ] as const;

    const hasSecondaryButton = Boolean(secondaryLabel && onSecondaryPress);
    const hasTimerButton = showTimerButton && onTimerPress;

    const dynamicStyles = useMemo(
      () => ({
        secondaryButton: { shadowColor: colors.shadow },
        timerButton: { shadowColor: colors.shadow },
      }),
      [colors.shadow]
    );

    return (
      <View style={styles.wrapper}>
        {/* Optimized gradient with calculated colors */}
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.3, 0.6, 0.8, 1]}
          style={styles.gradient}
        />

        <View
          style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, LAYOUT.SPACING.SMALL) },
          ]}
        >
          {/* Timer button - positioned in top-right corner */}
          {hasTimerButton && (
            <View style={styles.timerContainer}>
              <TouchableOpacity
                onPress={onTimerPress}
                style={[
                  styles.timerButton,
                  dynamicStyles.timerButton,
                  {
                    backgroundColor: isTimerActive ? colors.tint : colors.card,
                    borderColor: isTimerActive ? colors.tint : colors.border,
                  },
                ]}
                activeOpacity={LAYOUT.OPACITY.PRESSED}
                accessibilityLabel={timerAccessibilityLabel || 'Sleep timer'}
                accessibilityRole="button"
                accessibilityState={{ selected: isTimerActive }}
              >
                <Ionicons
                  name={isTimerActive ? 'timer' : 'timer-outline'}
                  size={16}
                  color={isTimerActive ? colors.background : colors.textSecondary}
                />
                {isTimerActive && (
                  <ThemedText
                    type="caption"
                    style={[
                      styles.timerLabel,
                      {
                        color: colors.background,
                        fontWeight: '600',
                      },
                    ]}
                    skipDefaultColor
                  >
                    Timer
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons row */}
          <View style={styles.buttonsRow}>
            {hasSecondaryButton && (
              <View style={styles.buttonContainer}>
                <ThemedButton
                  title={secondaryLabel!}
                  onPress={onSecondaryPress}
                  variant={secondaryVariant}
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    dynamicStyles.secondaryButton,
                    {
                      borderColor: colors.tint,
                      backgroundColor: colors.card, // Use theme-aware card background
                    },
                  ]}
                  disabled={secondaryDisabled}
                  accessibilityLabel={secondaryAccessibilityLabel || secondaryLabel!}
                />
              </View>
            )}
            <View
              style={hasSecondaryButton ? styles.buttonContainer : styles.fullWidthButtonContainer}
            >
              <ThemedButton
                title={primaryLabel}
                onPress={onPrimaryPress}
                variant={primaryVariant}
                style={styles.button}
                disabled={primaryDisabled}
                accessibilityLabel={primaryAccessibilityLabel || primaryLabel}
                disablePressAnimation={primaryDisablePressAnimation}
              />
            </View>
          </View>
        </View>
      </View>
    );
  }
);

BottomControls.displayName = 'BottomControls';

const styles = StyleSheet.create({
  button: {
    width: '100%',
  },
  buttonContainer: {
    width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`,
  },
  buttonsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.TINY,
    position: 'relative',
  },
  fullWidthButtonContainer: {
    width: '100%',
  },
  gradient: {
    bottom: -LAYOUT.BOTTOM_BAR.HEIGHT,
    height: 120,
    left: 0,
    position: 'absolute',
    right: 0,
    top: -LAYOUT.SPACING.LARGE,
  },
  secondaryButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  timerButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM, // Enhanced for better accessibility
    minWidth: MIN_TOUCH_TARGET.SIZE,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL, // Increased padding for easier touch
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  timerContainer: {
    position: 'absolute',
    right: LAYOUT.SCREEN_EDGE_PADDING,
    top: -LAYOUT.SPACING.SMALL,
    zIndex: 1,
  },
  timerLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.2,
    marginLeft: LAYOUT.SPACING.XTINY,
  },
  wrapper: {
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT - LAYOUT.SPACING.LARGE,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
});

export default BottomControls;
