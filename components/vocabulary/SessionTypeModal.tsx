// TODO: Replace with Expo Router native modal presentation
// Use router.push('/(tabs)/practice/session-type') with presentation: 'modal' instead
// This custom Modal should be replaced with native Expo Router modal for better performance

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { memo, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInDown,
  FadeOut,
  SlideOutDown,
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';

interface SessionTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onStartAudio: () => void;
  onStartVisual: () => void;
}

const SessionTypeModal = memo(
  ({ visible, onClose, onStartAudio, onStartVisual }: SessionTypeModalProps) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();
    const isClosingRef = useRef(false);

    // Direct shared values for better performance
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    // Reset animation values when modal visibility changes
    useEffect(() => {
      if (visible) {
        isClosingRef.current = false;
        cancelAnimation(translateY);
        cancelAnimation(opacity);
        translateY.value = 0;
        opacity.value = 1;
      } else {
        isClosingRef.current = false;
        translateY.value = 0;
        opacity.value = 1;
      }
    }, [visible, translateY, opacity]);

    // Cleanup animations on unmount
    useEffect(() => {
      return () => {
        cancelAnimation(translateY);
        cancelAnimation(opacity);
      };
    }, [translateY, opacity]);

    // Safe close handler
    const handleClose = useCallback(() => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      onClose();
    }, [onClose]);

    // Animated close
    const animateClose = useCallback(() => {
      if (isClosingRef.current) return;

      translateY.value = withTiming(400, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, finished => {
        if (finished) {
          runOnJS(handleClose)();
        }
      });
    }, [translateY, opacity, handleClose]);

    // Animate back to position
    const animateBack = useCallback(() => {
      if (isClosingRef.current) return;

      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withSpring(1, { damping: 15, stiffness: 150 });
    }, [translateY, opacity]);

    // Gesture handler for swipe to dismiss
    const gestureHandler = Gesture.Pan()
      .onUpdate(event => {
        if (isClosingRef.current || event.translationY <= 0) return;

        translateY.value = event.translationY;
        opacity.value = Math.max(0.3, 1 - event.translationY / 300);
      })
      .onEnd(event => {
        if (isClosingRef.current) return;

        const shouldDismiss = event.translationY > 80 || event.velocityY > 300;

        if (shouldDismiss) {
          runOnJS(animateClose)();
        } else {
          runOnJS(animateBack)();
        }
      });

    // Animated styles
    const animatedModalStyle = useAnimatedStyle(
      () => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
      }),
      [translateY, opacity]
    );

    if (!visible) return null;

    return (
      <Modal
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <Animated.View
          style={styles.overlay}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint={isDarkMode ? 'dark' : 'light'}
          />

          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

          <GestureDetector gesture={gestureHandler}>
            <Animated.View
              style={[
                styles.modalContainer,
                { backgroundColor: colors.background },
                animatedModalStyle,
              ]}
              entering={SlideInDown.duration(250).damping(15)}
              exiting={SlideOutDown.duration(200)}
            >
              <View style={[styles.closeIndicator, { backgroundColor: colors.modalIndicator }]} />

              <View style={styles.header}>
                <ThemedText style={styles.title} type="heading3">
                  Choose session type
                </ThemedText>
              </View>

              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: colors.card }]}
                  onPress={onStartVisual}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: withOpacity(colors.tint, 0.08) },
                    ]}
                  >
                    <Ionicons name="eye" size={24} color={colors.tint} />
                  </View>
                  <View style={styles.optionContent}>
                    <ThemedText style={styles.optionTitle} type="body" weight="semibold">
                      Visual
                    </ThemedText>
                    <ThemedText
                      colorName="secondaryText"
                      style={styles.optionDescription}
                      type="caption"
                    >
                      Tap and swipe
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: colors.card }]}
                  onPress={onStartAudio}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: withOpacity(colors.tint, 0.08) },
                    ]}
                  >
                    <Ionicons name="ear" size={24} color={colors.tint} />
                  </View>
                  <View style={styles.optionContent}>
                    <ThemedText style={styles.optionTitle} type="body" weight="semibold">
                      Audio
                    </ThemedText>
                    <ThemedText
                      colorName="secondaryText"
                      style={styles.optionDescription}
                      type="caption"
                    >
                      Listen while multitasking
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </Modal>
    );
  }
);

SessionTypeModal.displayName = 'SessionTypeModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeIndicator: {
    width: 32,
    height: 4,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignSelf: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  modalContainer: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  header: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  optionsContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  optionCard: {
    ...LAYOUT.ELEVATION.SUBTLE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  optionDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});

export default SessionTypeModal;
