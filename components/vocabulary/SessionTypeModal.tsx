// TODO: Replace with Expo Router native modal presentation
// Use router.push('/(tabs)/practice/session-type') with presentation: 'modal' instead
// This custom Modal should be replaced with native Expo Router modal for better performance

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInDown,
  FadeOut,
  SlideOutDown,
  runOnJS,
} from 'react-native-reanimated';

import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';

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

    // Animation hooks
    const {
      value: translateY,
      setValue: setTranslateY,
      animatedStyle: translateStyle,
    } = useTransformAnimation({
      type: 'translateY',
      useSpring: true,
      damping: 15,
      stiffness: 150,
    });

    const { setOpacity, animatedStyle: opacityStyle } = useOpacityAnimation();

    // Simple gesture handler
    const gestureHandler = Gesture.Pan()
      .onUpdate(event => {
        // Only allow downward swipes
        if (event.translationY > 0) {
          translateY.value = event.translationY;
          // Fade out as user swipes down
          setOpacity(Math.max(0.3, 1 - event.translationY / 200));
        }
      })
      .onEnd(event => {
        const shouldDismiss = event.translationY > 100 || event.velocityY > 500;

        if (shouldDismiss) {
          // Animate out and close
          setTranslateY(400);
          setOpacity(0, () => {
            runOnJS(onClose)();
          });
        } else {
          // Snap back to original position
          setTranslateY(0);
          setOpacity(1);
        }
      });

    // Animated styles
    const animatedModalStyle = [translateStyle, opacityStyle];

    if (!visible) return null;

    return (
      <Modal
        key={visible ? 'modal-open' : 'modal-closed'}
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

                {/* Audio Session */}
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
    ...LAYOUT.SHADOW.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingBottom: LAYOUT.SPACING.XLARGE,
    shadowOffset: {
      width: 0,
      height: -2,
    },
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
    ...LAYOUT.SHADOW.SUBTLE,
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
