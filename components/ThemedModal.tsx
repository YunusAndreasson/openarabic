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
import { useFadeInAnimation, useScaleAnimation } from '@/hooks/animations';

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
  widthPercentage = 0.85,
  maxWidth = 400,
  animationDuration = LAYOUT.ANIMATION.DURATION.NORMAL,
  blurIntensity = 80,
  animationType = 'fade',
}: ThemedModalProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Use standardized animation hooks
  const {
    animatedStyle: fadeAnimatedStyle,
    startAnimation: startFadeAnimation,
    reverseAnimation: reverseFadeAnimation,
  } = useFadeInAnimation(0, animationDuration);
  const {
    animatedStyle: scaleAnimatedStyle,
    startAnimation: startScaleAnimation,
    reverseAnimation: reverseScaleAnimation,
  } = useScaleAnimation(0.95, 1, animationDuration);

  // Start animations when modal becomes visible
  useEffect(() => {
    if (visible && animated) {
      startFadeAnimation();
      startScaleAnimation();
    }
  }, [visible, animated, startFadeAnimation, startScaleAnimation]);

  // Function to close without haptic feedback
  const triggerClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (!closeOnBackdropPress) return;

    if (animated) {
      // Run exit animations
      reverseFadeAnimation();
      reverseScaleAnimation();

      // Delay the actual close to allow animations to complete
      setTimeout(() => {
        triggerClose();
      }, LAYOUT.ANIMATION.DURATION.FAST);
    } else {
      triggerClose();
    }
  }, [closeOnBackdropPress, animated, reverseFadeAnimation, reverseScaleAnimation, triggerClose]);

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
        backgroundColor: colors.modalOverlay,
      },
    ],
    [colors.modalOverlay]
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

  // Create combined animated style
  const combinedAnimatedStyle = useMemo(() => {
    if (!animated) {
      return {};
    }

    return {
      opacity: fadeAnimatedStyle.opacity,
      transform: scaleAnimatedStyle.transform,
    };
  }, [animated, fadeAnimatedStyle, scaleAnimatedStyle]);

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
              style={[defaultContentStyle, combinedAnimatedStyle]}
              entering={FadeIn.duration(animationDuration)}
              exiting={FadeOut.duration(150)}
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
            style={[defaultContentStyle, combinedAnimatedStyle]}
            entering={FadeIn.duration(animationDuration)}
            exiting={FadeOut.duration(150)}
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
