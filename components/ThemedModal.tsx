import React, { useCallback, useEffect, useMemo, ReactNode, useRef } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
  TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import Animated from 'react-native-reanimated';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { ThemedModalProps } from '@/types/ui.types';

/**
 * A themed modal component with optional blur background, animation, and close button.
 * This component handles various common modal patterns and provides a consistent UI
 * across the application.
 */

// Create a component for the modal content with animations
const AnimatedModalContent = ({
  children,
  contentStyle,
  animationDuration,
  showCloseButton,
  title,
  titleStyle,
  handleBackdropPress,
  isDarkMode,
  colors,
}: {
  children: ReactNode;
  contentStyle: any;
  animationDuration: number;
  showCloseButton: boolean;
  title?: string;
  titleStyle?: TextStyle;
  handleBackdropPress: () => void;
  isDarkMode: boolean;
  colors: any;
}) => {
  // Use our custom fade-in animation hooks
  const { animatedStyle: contentAnimatedStyle, startAnimation: startContentAnimation } =
    useOpacityAnimation({ initialOpacity: 0, delay: 0, duration: animationDuration });
  const { animatedStyle: childrenAnimatedStyle, startAnimation: startChildrenAnimation } =
    useOpacityAnimation({ initialOpacity: 0, delay: 0, duration: 300 });

  // Start animations when component mounts
  useEffect(() => {
    startContentAnimation();
    // Delay the children animation slightly
    const timeoutId = setTimeout(() => {
      startChildrenAnimation();
    }, 100);

    // Clean up timeout when component unmounts
    return () => clearTimeout(timeoutId);
  }, [startContentAnimation, startChildrenAnimation]);

  return (
    <Animated.View style={[contentStyle, contentAnimatedStyle]}>
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
        <Animated.View style={childrenAnimatedStyle}>{children}</Animated.View>
      </Pressable>
    </Animated.View>
  );
};

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
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    animatedStyle: modalContainerAnimatedStyle,
    startAnimation: startModalAnimation,
    reset: resetModalAnimation,
  } = useOpacityAnimation({ initialOpacity: 0, delay: 0, duration: animationDuration });

  // Use scale animation for the modal content
  const {
    animatedStyle: modalScaleStyle,
    startAnimation: startScaleAnimation,
    reset: resetScaleAnimation,
  } = useTransformAnimation({
    type: 'scale',
    initialValue: 0.95,
    targetValue: 1,
    duration: animationDuration,
  });

  // Start animations when modal becomes visible
  useEffect(() => {
    if (visible && animated) {
      startModalAnimation();
      startScaleAnimation();
    }
  }, [visible, animated, startModalAnimation, startScaleAnimation]);

  // Clean up any pending timeouts when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  // Function to close without haptic feedback
  const triggerClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (!closeOnBackdropPress) return;

    if (animated) {
      // Run exit animations
      resetModalAnimation();
      resetScaleAnimation();

      // Clear any existing timeout
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }

      // Delay the actual close to allow animations to complete
      closeTimeoutRef.current = setTimeout(() => {
        triggerClose();
        closeTimeoutRef.current = null;
      }, LAYOUT.ANIMATION.DURATION.FAST);
    } else {
      triggerClose();
    }
  }, [closeOnBackdropPress, animated, resetModalAnimation, resetScaleAnimation, triggerClose]);

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
      opacity: modalContainerAnimatedStyle.opacity,
      transform: modalScaleStyle.transform,
    };
  }, [animated, modalContainerAnimatedStyle, modalScaleStyle]);

  // Use the AnimatedModalContent component for both blur and non-blur cases
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={handleBackdropPress}
      animationType="none"
      statusBarTranslucent
    >
      {useBlur ? (
        <BlurView
          intensity={blurIntensity}
          style={StyleSheet.absoluteFill}
          tint={isDarkMode ? 'dark' : 'light'}
        >
          <Pressable style={containerStyle} onPress={handleBackdropPress}>
            <AnimatedModalContent
              contentStyle={[defaultContentStyle, combinedAnimatedStyle]}
              animationDuration={animationDuration}
              showCloseButton={showCloseButton}
              title={title}
              titleStyle={titleStyle}
              handleBackdropPress={handleBackdropPress}
              isDarkMode={isDarkMode}
              colors={colors}
            >
              {children}
            </AnimatedModalContent>
          </Pressable>
        </BlurView>
      ) : (
        <Pressable style={containerStyle} onPress={handleBackdropPress}>
          <AnimatedModalContent
            contentStyle={[defaultContentStyle, combinedAnimatedStyle]}
            animationDuration={animationDuration}
            showCloseButton={showCloseButton}
            title={title}
            titleStyle={titleStyle}
            handleBackdropPress={handleBackdropPress}
            isDarkMode={isDarkMode}
            colors={colors}
          >
            {children}
          </AnimatedModalContent>
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
