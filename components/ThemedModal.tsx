import React, { useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';

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
}: ThemedModalProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Run animations when visibility changes
  useEffect(() => {
    if (visible) {
      // Reset animation to initial value
      fadeAnim.setValue(0);

      // Start animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim, animationDuration]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (!closeOnBackdropPress) return;

    if (animated) {
      // Run exit animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: LAYOUT.ANIMATION.DURATION.FAST,
        useNativeDriver: true,
      }).start(() => {
        if (useHaptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onClose();
      });
    } else {
      if (useHaptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onClose();
    }
  }, [closeOnBackdropPress, animated, fadeAnim, useHaptics, onClose]);

  // Calculate modal width
  const modalWidth = useMemo(() => {
    const { width } = Dimensions.get('window');
    return Math.min(width * widthPercentage, maxWidth);
  }, [widthPercentage, maxWidth]);

  // Memoize styles to prevent new object creation on each render
  const containerStyle = useMemo(
    () => [styles.modalContainer, { backgroundColor: colors.modalOverlay }],
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

  // Create animated style
  const animatedContentStyle = useMemo(
    () => ({
      opacity: animated ? fadeAnim : 1,
    }),
    [animated, fadeAnim]
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
            <Animated.View style={animatedContentStyle}>
              <Pressable style={defaultContentStyle} onPress={e => e.stopPropagation()}>
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
                {children}
              </Pressable>
            </Animated.View>
          </Pressable>
        </BlurView>
      ) : (
        <Pressable style={containerStyle} onPress={handleBackdropPress}>
          <Animated.View style={animatedContentStyle}>
            <Pressable style={defaultContentStyle} onPress={e => e.stopPropagation()}>
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
              {children}
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
  },
  modalContent: {
    paddingTop: LAYOUT.SPACING.XXLARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    ...LAYOUT.SHADOW.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.MODAL,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    right: LAYOUT.SPACING.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  closeButton: {
    padding: LAYOUT.SPACING.TINY,
  },
  modalTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: 'bold',
    marginBottom: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
});

// Memoize the component to prevent unnecessary rerenders
export const ThemedModal = React.memo(ThemedModalComponent);

export default ThemedModal;
