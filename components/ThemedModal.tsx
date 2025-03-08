import React, { useCallback, useEffect, useMemo, ReactNode } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  Layout,
  Easing,
} from 'react-native-reanimated';

interface ThemedModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  /**
   * Function to call when the modal is closed
   */
  onClose: () => void;
  /**
   * The content to display in the modal
   */
  children: ReactNode;
  /**
   * Optional title for the modal
   */
  title?: string;
  /**
   * Whether to use a blur effect for the backdrop
   * @default true
   */
  useBlur?: boolean;
  /**
   * Whether to show a close button
   * @default true
   */
  showCloseButton?: boolean;
  /**
   * Whether to animate the modal
   * @default true
   */
  animated?: boolean;
  /**
   * Custom style for the modal content container
   */
  contentStyle?: ViewStyle;
  /**
   * Custom style for the modal title
   */
  titleStyle?: TextStyle;
  /**
   * Whether to close the modal when tapping the backdrop
   * @default true
   */
  closeOnBackdropPress?: boolean;
  /**
   * Whether to use haptic feedback when closing
   * @default true
   */
  useHaptics?: boolean;
  /**
   * Custom width for the modal (percentage of screen width)
   * @default 0.85
   */
  widthPercentage?: number;
  /**
   * Maximum width for the modal
   * @default 400
   */
  maxWidth?: number;
  /**
   * Animation duration in milliseconds
   * @default LAYOUT.ANIMATION.DURATION.NORMAL
   */
  animationDuration?: number;
  /**
   * Blur intensity for the backdrop
   * @default 80
   */
  blurIntensity?: number;
  /**
   * Animation type for the modal
   * @default 'fade'
   */
  animationType?: 'fade' | 'slide' | 'none';
  /**
   * Opacity of the modal overlay
   * @default 0.8
   */
  overlayOpacity?: number;
}

/**
 * A reusable modal component that adapts to the current theme
 */
function ThemedModalComponent({
  visible,
  onClose,
  children,
  title,
  useBlur = true,
  showCloseButton = true,
  animated = true,
  contentStyle,
  titleStyle,
  closeOnBackdropPress = true,
  useHaptics = true,
  widthPercentage = 0.85,
  maxWidth = 400,
  animationDuration = LAYOUT.ANIMATION.DURATION.NORMAL,
  blurIntensity = 80,
  animationType = 'fade',
  overlayOpacity = 0.8,
}: ThemedModalProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);

  // Run animations when visibility changes
  useEffect(() => {
    if (visible) {
      // Reset animation to initial values
      fadeAnim.value = 0;
      scaleAnim.value = 0.95;

      // Start animations with optimized timing
      fadeAnim.value = withTiming(1, {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      });

      scaleAnim.value = withTiming(1, {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible, fadeAnim, scaleAnim, animationDuration]);

  // Function to close without haptic feedback
  const triggerClose = useCallback(() => {
    // Removed haptic feedback
    onClose();
  }, [onClose]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (!closeOnBackdropPress) return;

    if (animated) {
      // Run exit animation using Reanimated
      fadeAnim.value = withTiming(
        0,
        {
          duration: LAYOUT.ANIMATION.DURATION.FAST,
          easing: Easing.in(Easing.cubic),
        },
        () => {
          runOnJS(triggerClose)();
        }
      );

      scaleAnim.value = withTiming(0.95, {
        duration: LAYOUT.ANIMATION.DURATION.FAST,
        easing: Easing.in(Easing.cubic),
      });
    } else {
      triggerClose();
    }
  }, [closeOnBackdropPress, animated, fadeAnim, scaleAnim, triggerClose]);

  // Calculate modal width
  const modalWidth = useMemo(() => {
    const { width } = Dimensions.get('window');
    return Math.min(width * widthPercentage, maxWidth);
  }, [widthPercentage, maxWidth]);

  // Memoize styles to prevent new object creation on each render
  const containerStyle = useMemo(
    () => [
      styles.modalContainer,
      {
        backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
      },
    ],
    [overlayOpacity]
  );

  const defaultContentStyle = useMemo(
    () => [
      styles.modalContent,
      {
        backgroundColor: colors.cardBackground,
        shadowColor: colors.shadow,
        borderColor: colors.cardBorder,
        width: modalWidth,
      },
      contentStyle,
    ],
    [colors.cardBackground, colors.shadow, colors.cardBorder, modalWidth, contentStyle]
  );

  // Create animated style with Reanimated
  const animatedContentStyle = useAnimatedStyle(
    () => ({
      opacity: animated ? fadeAnim.value : 1,
      transform: [{ scale: animated ? scaleAnim.value : 1 }],
    }),
    [animated]
  );

  return (
    <Modal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={handleBackdropPress}
      statusBarTranslucent={true}
    >
      {useBlur ? (
        <BlurView
          intensity={blurIntensity}
          style={StyleSheet.absoluteFill}
          tint={isDarkMode ? 'dark' : 'light'}
        >
          <Pressable style={containerStyle} onPress={handleBackdropPress}>
            <Animated.View
              style={[defaultContentStyle, animatedContentStyle]}
              entering={FadeIn.duration(animationDuration).easing(Easing.out(Easing.cubic))}
              exiting={FadeOut.duration(150)}
              layout={Layout.springify().damping(20).stiffness(300)}
            >
              <Pressable onPress={e => e.stopPropagation()}>
                {showCloseButton && (
                  <View style={styles.closeButtonContainer}>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={handleBackdropPress}
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={28}
                        color={isDarkMode ? colors.tabIconDefault : colors.icon}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                {title && (
                  <ThemedText
                    style={[styles.modalTitle, titleStyle]}
                    skipDefaultColor={!!titleStyle}
                  >
                    {title}
                  </ThemedText>
                )}
                <Animated.View entering={FadeIn.delay(100).duration(300)}>{children}</Animated.View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </BlurView>
      ) : (
        <Pressable style={containerStyle} onPress={handleBackdropPress}>
          <Animated.View
            style={[defaultContentStyle, animatedContentStyle]}
            entering={FadeIn.duration(animationDuration).easing(Easing.out(Easing.cubic))}
            exiting={FadeOut.duration(150)}
            layout={Layout.springify().damping(20).stiffness(300)}
          >
            <Pressable onPress={e => e.stopPropagation()}>
              {showCloseButton && (
                <View style={styles.closeButtonContainer}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleBackdropPress}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={28}
                      color={isDarkMode ? colors.tabIconDefault : colors.icon}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {title && (
                <ThemedText style={[styles.modalTitle, titleStyle]} skipDefaultColor={!!titleStyle}>
                  {title}
                </ThemedText>
              )}
              <Animated.View entering={FadeIn.delay(100).duration(300)}>{children}</Animated.View>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  modalContent: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.LARGE,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    padding: LAYOUT.SPACING.SMALL,
  },
  closeButton: {
    padding: 4,
  },
});

// Memoize the entire component
export const ThemedModal = React.memo(ThemedModalComponent);
ThemedModal.displayName = 'ThemedModal';
