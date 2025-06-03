import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
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
import { lightFeedback, mediumFeedback } from '@/utils/haptics';

import { ThemedText } from '../ThemedText';
import BaseCard from '../BaseCard';

interface SessionOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
  disabled?: boolean;
}

interface SessionOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  dueWordsCount: number;
  strugglingWordsCount: number;
  onStartPractice: (wordType: 'due' | 'struggling') => void;
  onStartListen: (wordType: 'due' | 'struggling') => void;
}

export default memo(function SessionOptionsModal({
  visible,
  onClose,
  dueWordsCount,
  strugglingWordsCount,
  onStartPractice,
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
    runOnJS(lightFeedback)();
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

  // Session options configuration
  const sessionOptions: SessionOption[] = [
    {
      id: 'practice-due',
      title: `Practice ${dueWordsCount} Due Words`,
      subtitle: `Stay on track with words ready for review`,
      icon: 'alarm-outline',
      iconColor: colors.warning,
      onPress: () => handleOptionPress(() => onStartPractice('due')),
      disabled: dueWordsCount === 0,
    },
    {
      id: 'practice-struggling',
      title: `Practice ${strugglingWordsCount} Hard Words`,
      subtitle: `Focus on words you find challenging`,
      icon: 'alert-circle',
      iconColor: colors.error,
      onPress: () => handleOptionPress(() => onStartPractice('struggling')),
      disabled: strugglingWordsCount === 0,
    },
    {
      id: 'listen-struggling',
      title: `Listen to ${strugglingWordsCount} Hard Words`,
      subtitle: `Hear pronunciation on the go`,
      icon: 'volume-high',
      iconColor: colors.error,
      onPress: () => handleOptionPress(() => onStartListen('struggling')),
      disabled: strugglingWordsCount === 0,
    },
  ];

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
                    Choose Practice Mode
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.subtitle}>
                    Select how you want to study your vocabulary
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Options Grid */}
              <View style={styles.optionsContainer}>
                {sessionOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={option.disabled ? undefined : option.onPress}
                    disabled={option.disabled}
                    style={[styles.optionButton, option.disabled && styles.disabledOption]}
                    activeOpacity={0.7}
                  >
                    <BaseCard
                      style={[styles.optionCard, option.disabled && { opacity: 0.5 }]}
                      shadowSize="small"
                      includePressAnimation={false}
                    >
                      <View style={styles.optionContent}>
                        <View
                          style={[
                            styles.iconContainer,
                            { backgroundColor: option.iconColor + '20' },
                          ]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={24}
                            color={option.disabled ? colors.textTertiary : option.iconColor}
                          />
                        </View>
                        <View style={styles.textContainer}>
                          <ThemedText
                            type="body"
                            weight="bold"
                            style={[
                              styles.optionTitle,
                              option.disabled && { color: colors.textTertiary },
                            ]}
                            numberOfLines={2}
                          >
                            {option.title}
                          </ThemedText>
                          <ThemedText
                            type="caption"
                            variant="secondary"
                            style={[
                              styles.optionSubtitle,
                              option.disabled && { color: colors.textTertiary },
                            ]}
                            numberOfLines={2}
                          >
                            {option.subtitle}
                          </ThemedText>
                        </View>
                        <View style={styles.chevronContainer}>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={option.disabled ? colors.textTertiary : colors.textSecondary}
                          />
                        </View>
                      </View>
                    </BaseCard>
                  </TouchableOpacity>
                ))}
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  modal: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: LAYOUT.OPACITY.LIGHT,
    shadowRadius: 12,
    elevation: LAYOUT.ELEVATION.MEDIUM,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  title: {
    marginBottom: LAYOUT.SPACING.XSMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.2,
  },
  subtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionsContainer: {
    padding: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  optionButton: {
    width: '100%',
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionCard: {
    width: '100%',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
    minHeight: 72,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  textContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  optionTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
  },
  optionSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  chevronContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
});
