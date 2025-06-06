import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { mediumFeedback } from '@/utils/haptics';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';

interface SessionOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
}

interface SessionOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  dueWordsCount: number;
  onStartReview: () => void;
  onStartListen: () => void;
}

export default memo(function SessionOptionsModal({
  visible,
  onClose,
  dueWordsCount,
  onStartReview,
  onStartListen,
}: SessionOptionsModalProps) {
  const colors = useColors();
  const screenHeight = Dimensions.get('window').height;

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(screenHeight);

  // Handle modal animations
  useEffect(() => {
    if (visible) {
      // Show modal
      backdropOpacity.value = withTiming(1, { duration: 300 });
      modalTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      // Hide modal
      backdropOpacity.value = withTiming(0, { duration: 200 });
      modalTranslateY.value = withTiming(screenHeight * 0.5, { duration: 200 });
    }
  }, [visible, backdropOpacity, modalTranslateY, screenHeight]);

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const handleClose = () => {
    onClose();
  };

  const handleBackdropPress = () => {
    handleClose();
  };

  const handleOptionPress = (callback: () => void) => {
    runOnJS(mediumFeedback)();
    onClose();
    callback();
  };

  // Simple session options - just Visual or Audio
  const sessionOptions: SessionOption[] = [
    {
      id: 'visual-review',
      title: 'Visual Practice',
      subtitle: 'Swipe through words',
      icon: 'eye-outline',
      iconColor: colors.tint,
      onPress: () => handleOptionPress(onStartReview),
    },
    {
      id: 'audio-review',
      title: 'Audio Practice',
      subtitle: 'Listen and learn',
      icon: 'headset-outline',
      iconColor: colors.info,
      onPress: () => handleOptionPress(onStartListen),
    },
  ];

  // Check if we have any words to practice
  const hasWordsToStudy = dueWordsCount > 0;

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View
          style={[styles.backdrop, backdropStyle, { backgroundColor: colors.backdropOverlay }]}
        >
          <Animated.View style={[styles.modalContainer, modalStyle]} pointerEvents="box-none">
            <View
              style={[
                styles.modal,
                {
                  backgroundColor: colors.background,
                  shadowColor: colors.shadow,
                },
              ]}
              pointerEvents="auto"
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.borderOverlay }]}>
                <View style={styles.headerContent}>
                  <ThemedText type="heading2" weight="bold" style={styles.title}>
                    Practice Mode
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.subtitle}>
                    How would you like to practice {dueWordsCount} words?
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={LAYOUT.HIT_SLOP.SMALL}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Options Grid */}
              <View style={styles.optionsContainer}>
                {!hasWordsToStudy ? (
                  <View style={styles.emptyState}>
                    <ThemedText type="body" variant="secondary" style={styles.emptyText}>
                      You&apos;re all caught up!
                    </ThemedText>
                    <ThemedText type="caption" variant="secondary" style={styles.emptySubtext}>
                      Add more words to practice
                    </ThemedText>
                  </View>
                ) : (
                  sessionOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.id}
                      onPress={option.onPress}
                      style={[styles.optionButton, index === 0 && styles.primaryOption]}
                      activeOpacity={0.7}
                    >
                      <BaseCard
                        style={[styles.optionCard, index === 0 && styles.primaryCard]}
                        shadowSize={index === 0 ? 'medium' : 'small'}
                        includePressAnimation={false}
                      >
                        <View style={styles.optionContent}>
                          <View
                            style={[
                              styles.iconContainer,
                              { backgroundColor: option.iconColor + '20' },
                              index === 0 && styles.primaryIconContainer,
                            ]}
                          >
                            <Ionicons
                              name={option.icon}
                              size={index === 0 ? 26 : 24}
                              color={option.iconColor}
                            />
                          </View>
                          <View style={styles.textContainer}>
                            <ThemedText
                              type={index === 0 ? 'heading3' : 'body'}
                              weight="bold"
                              style={styles.optionTitle}
                              numberOfLines={2}
                            >
                              {option.title}
                            </ThemedText>
                            <ThemedText
                              type="caption"
                              variant="secondary"
                              style={styles.optionSubtitle}
                              numberOfLines={2}
                            >
                              {option.subtitle}
                            </ThemedText>
                          </View>
                          <View style={styles.chevronContainer}>
                            <Ionicons
                              name="chevron-forward"
                              size={index === 0 ? 18 : 16}
                              color={colors.secondaryText}
                            />
                          </View>
                        </View>
                      </BaseCard>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chevronContainer: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  closeButton: {
    alignItems: 'center',
    flexShrink: 0,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.XLARGE,
  },
  emptySubtext: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  emptyText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    width: 48,
  },
  modal: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    elevation: LAYOUT.ELEVATION.MEDIUM,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: LAYOUT.OPACITY.LIGHT,
    shadowRadius: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  optionButton: {
    width: '100%',
  },
  optionCard: {
    width: '100%',
  },
  optionContent: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 72,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  optionSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  optionTitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  optionsContainer: {
    gap: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  primaryCard: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  primaryIconContainer: {
    borderRadius: 26,
    height: 52,
    width: 52,
  },
  primaryOption: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  subtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  textContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  title: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.2,
    marginBottom: LAYOUT.SPACING.XSMALL,
  },
});
