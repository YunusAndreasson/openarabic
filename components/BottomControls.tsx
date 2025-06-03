import React, { memo, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { MIN_TOUCH_TARGET } from '@/constants/layout';

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
                    backgroundColor: isTimerActive ? colors.tint : colors.elevation1,
                    borderColor: isTimerActive ? colors.tint : colors.borderOverlay,
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
                  color={isTimerActive ? colors.background : colors.textTertiary}
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
                  onPress={onSecondaryPress!}
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
  wrapper: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  gradient: {
    position: 'absolute',
    top: -LAYOUT.SPACING.LARGE,
    left: 0,
    right: 0,
    bottom: -LAYOUT.BOTTOM_BAR.HEIGHT,
    height: 120,
  },
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.TINY,
    position: 'relative',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonContainer: {
    width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`,
  },
  button: {
    width: '100%',
  },
  secondaryButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  timerContainer: {
    position: 'absolute',
    top: -LAYOUT.SPACING.SMALL,
    right: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: 1,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderWidth: 1,
    minWidth: MIN_TOUCH_TARGET.SIZE,
    minHeight: MIN_TOUCH_TARGET.SMALL,
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
  timerLabel: {
    marginLeft: LAYOUT.SPACING.XTINY,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.2,
  },
  fullWidthButtonContainer: {
    width: '100%',
  },
});

export default BottomControls;
