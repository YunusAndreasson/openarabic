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

import { Colors } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';
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
      statusBarTranslucent
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View
          style={[styles.backdrop, backdropStyle, { backgroundColor: colors.backdropOverlay }]}
        >
          <Animated.View pointerEvents="box-none" style={[styles.modalContainer, modalStyle]}>
            <View
              pointerEvents="auto"
              style={[
                styles.modal,
                {
                  backgroundColor: colors.background,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.borderOverlay }]}>
                <View style={styles.headerContent}>
                  <ThemedText style={styles.title} type="heading2" weight="bold">
                    Practice Mode
                  </ThemedText>
                  <ThemedText style={styles.subtitle} type="body" variant="secondary">
                    How would you like to practice {dueWordsCount} words?
                  </ThemedText>
                </View>
                <TouchableOpacity
                  hitSlop={LAYOUT.HIT_SLOP.SMALL}
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Ionicons color={colors.text} name="close" size={22} />
                </TouchableOpacity>
              </View>

              {/* Options Grid */}
              <View style={styles.optionsContainer}>
                {!hasWordsToStudy ? (
                  <View style={styles.emptyState}>
                    <ThemedText style={styles.emptyText} type="body" variant="secondary">
                      You&apos;re all caught up!
                    </ThemedText>
                    <ThemedText style={styles.emptySubtext} type="caption" variant="secondary">
                      Add more words to practice
                    </ThemedText>
                  </View>
                ) : (
                  sessionOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.id}
                      activeOpacity={0.7}
                      style={[styles.optionButton, index === 0 && styles.primaryOption]}
                      onPress={option.onPress}
                    >
                      <BaseCard
                        includePressAnimation={false}
                        shadowSize={index === 0 ? 'medium' : 'small'}
                        style={[styles.optionCard, index === 0 && styles.primaryCard]}
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
                              color={option.iconColor}
                              name={option.icon}
                              size={index === 0 ? 26 : 24}
                            />
                          </View>
                          <View style={styles.textContainer}>
                            <ThemedText
                              numberOfLines={2}
                              style={styles.optionTitle}
                              type={index === 0 ? 'heading3' : 'body'}
                              weight="bold"
                            >
                              {option.title}
                            </ThemedText>
                            <ThemedText
                              numberOfLines={2}
                              style={styles.optionSubtitle}
                              type="caption"
                              variant="secondary"
                            >
                              {option.subtitle}
                            </ThemedText>
                          </View>
                          <View style={styles.chevronContainer}>
                            <Ionicons
                              color={colors.secondaryText}
                              name="chevron-forward"
                              size={index === 0 ? 18 : 16}
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
    borderColor: withOpacity(Colors.light.white, 0.1),
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
