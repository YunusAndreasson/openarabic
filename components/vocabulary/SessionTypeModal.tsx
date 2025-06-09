// TODO: Replace with Expo Router native modal presentation
// Use router.push('/(tabs)/practice/session-type') with presentation: 'modal' instead
// This custom Modal should be replaced with native Expo Router modal for better performance

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { memo, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInDown,
  FadeOut,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

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

    // Gesture values
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    // Reset animated values when modal becomes visible
    useEffect(() => {
      if (visible) {
        // Immediately reset values without animation
        translateY.value = 0;
        opacity.value = 1;
      } else {
        // Reset when modal closes to ensure clean state
        translateY.value = 0;
        opacity.value = 1;
      }
    }, [visible, translateY, opacity]);

    const handleOptionPress = (onAction: () => void) => {
      onAction();
    };

    // Gesture handler for swipe down to dismiss
    const gestureHandler = useAnimatedGestureHandler({
      onActive: event => {
        // Only allow downward swipes
        if (event.translationY > 0) {
          translateY.value = event.translationY;
          // Fade out as user swipes down
          opacity.value = Math.max(0.3, 1 - event.translationY / 200);
        }
      },
      onEnd: event => {
        const shouldDismiss = event.translationY > 100 || event.velocityY > 500;

        if (shouldDismiss) {
          // Animate out and close
          translateY.value = withTiming(300, { duration: 200 });
          opacity.value = withTiming(0, { duration: 200 });
          runOnJS(onClose)();
        } else {
          // Snap back to original position
          translateY.value = withSpring(0);
          opacity.value = withSpring(1);
        }
      },
    });

    // Animated style for modal container
    const animatedModalStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    }));

    if (!visible) return null;

    return (
      <Modal
        key={visible ? 'open' : 'closed'}
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
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

          {/* Backdrop to close */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <PanGestureHandler key={`gesture-${visible}`} onGestureEvent={gestureHandler}>
            <Animated.View
              style={[
                styles.modalContainer,
                { backgroundColor: colors.background },
                animatedModalStyle,
              ]}
              entering={SlideInDown.duration(250).damping(15)}
              exiting={SlideOutDown.duration(200)}
            >
              {/* Close indicator */}
              <View style={[styles.closeIndicator, { backgroundColor: colors.modalIndicator }]} />

              {/* Header */}
              <View style={styles.header}>
                <ThemedText style={styles.title} type="heading3">
                  Choose session type
                </ThemedText>
              </View>

              {/* Session Options */}
              <View style={styles.optionsContainer}>
                {/* Visual Session */}
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: colors.card }]}
                  onPress={() => handleOptionPress(onStartVisual)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
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

                {/* Audio Session */}
                <TouchableOpacity
                  style={[styles.optionCard, { backgroundColor: colors.card }]}
                  onPress={() => handleOptionPress(onStartAudio)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
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
          </PanGestureHandler>
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
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingBottom: LAYOUT.SPACING.XLARGE,
    shadowColor: Colors.light.black,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },

  optionsContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    shadowColor: Colors.light.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
