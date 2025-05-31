import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';
import { lightFeedback } from '@/utils/haptics';

import { ThemedText } from '../ThemedText';

export type InfoModalType =
  | 'streak'
  | 'mastery'
  | 'retrievability'
  | 'difficulty'
  | 'efficiency'
  | 'recommendation';

interface InfoModalProps {
  visible: boolean;
  type: InfoModalType | null;
  onClose: () => void;
}

interface InfoContent {
  title: string;
  subtitle: string;
  sections: Array<{
    title: string;
    content: string;
    icon?: keyof typeof Ionicons.glyphMap;
  }>;
  tips: string[];
}

const INFO_CONTENT: Record<InfoModalType, InfoContent> = {
  recommendation: {
    title: 'Smart Learning Recommendations',
    subtitle:
      'Your personalized study guidance based on spaced repetition science and cognitive load theory. The system analyzes your review load and memory patterns to suggest the optimal next action.',
    sections: [
      {
        title: 'Review First',
        content:
          'When you have 15+ overdue words or >25% of your deck is due. Focus on reviewing before adding new words to maintain strong retention and avoid cognitive overload.',
        icon: 'refresh-circle',
      },
      {
        title: 'Review Then Add',
        content:
          'When you have 5-15 due words with moderate review load. Complete your reviews first, then safely add a few new words to maintain balance.',
        icon: 'library',
      },
      {
        title: 'Add New Words',
        content:
          'When you have few or no due words. Perfect time to expand your vocabulary! Your brain has optimal capacity for encoding new information.',
        icon: 'add-circle',
      },
    ],
    tips: [
      'Follow recommendations for 2-3x better retention rates',
      'Add 3-5 new words when optimal, 5-10 when starting out',
      'Consistency matters more than daily volume',
      'Review when mentally fresh for best results',
    ],
  },
  streak: {
    title: 'Consistency',
    subtitle:
      'Shows your daily vocabulary practice over the last 7 days with current and longest streak counts. Consistent daily practice strengthens neural pathways and improves retention by up to 400% compared to sporadic study.',
    sections: [
      {
        title: 'Why Consistency Matters',
        content:
          'Daily practice, even just 2-3 words, builds stronger neural pathways than marathon study sessions. Your brain consolidates memories during sleep, making daily exposure crucial.',
        icon: 'calendar',
      },
      {
        title: 'Building Habits',
        content:
          'Link vocabulary practice to existing routines like morning coffee or commute. Small, consistent actions compound into significant progress over time.',
        icon: 'link',
      },
    ],
    tips: [
      'Even 2-3 words daily builds momentum',
      'Link practice to existing daily routines',
      'Focus on consistency over perfection',
      'Celebrate small wins to maintain motivation',
    ],
  },
  mastery: {
    title: 'Mastery Progress',
    subtitle:
      'Tracks how well you know each word over time. Words are considered mastered when you can recall them automatically with high confidence. The chart shows your vocabulary becoming automatic.',
    sections: [
      {
        title: 'Mastery Levels',
        content:
          'Words progress from New → Learning → Review → Mastered. Mastered words have strong memory traces and require less frequent review.',
        icon: 'trending-up',
      },
      {
        title: 'Optimal Range',
        content:
          'Aim for 60-80% mastery rate. This balance ensures steady progress without overwhelming difficulty. Too high means you need more challenge, too low suggests reviewing methods.',
        icon: 'checkmark-circle',
      },
    ],
    tips: [
      'Steep climbs indicate effective learning periods',
      'Plateaus are normal - focus on consistency',
      'Quality recall beats speed',
      'Use context and associations for better retention',
    ],
  },
  retrievability: {
    title: 'Retention Forecast',
    subtitle:
      'Predicts your average memory strength for the next 14 days using spaced repetition science. Shows when words will drop below optimal retention levels.',
    sections: [
      {
        title: 'Memory Strength',
        content:
          'The 70% threshold is optimal for review timing - high enough for successful recall, low enough for memory strengthening through retrieval practice.',
        icon: 'analytics-outline',
      },
      {
        title: 'Planning Reviews',
        content:
          'Plan study sessions 1-2 days before predicted drops to maintain strong retention. This prevents forgetting while maximizing memory consolidation.',
        icon: 'time-outline',
      },
    ],
    tips: [
      'Review just before forgetting for strongest memories',
      'Green zones indicate stable retention',
      'Red zones suggest immediate review needed',
      'Consistent practice prevents steep drops',
    ],
  },
  difficulty: {
    title: 'Word Difficulty',
    subtitle:
      'Shows how challenging your vocabulary is across three levels: Easy (quick recall), Medium (some effort), and Hard (frequent mistakes). Optimal distribution ensures sustainable learning.',
    sections: [
      {
        title: 'Difficulty Levels',
        content:
          'Easy words build confidence and fluency. Medium words provide appropriate challenge. Hard words should be limited to prevent mental fatigue.',
        icon: 'bar-chart',
      },
      {
        title: 'Optimal Balance',
        content:
          'Target 60-70% Easy-Medium range for sustainable learning. Too many hard words create frustration and reduce motivation.',
        icon: 'stats-chart-outline',
      },
    ],
    tips: [
      'Use easy words as confidence builders',
      'Gradually introduce challenging vocabulary',
      'Break down hard words into smaller parts',
      'Focus on high-frequency words first',
    ],
  },
  efficiency: {
    title: 'Learning Efficiency',
    subtitle:
      'Measures how effectively your study time converts to lasting memory over 14 days. Based on word progression, stability gains, and success rates.',
    sections: [
      {
        title: 'Efficiency Range',
        content:
          'Target 70-85% efficiency. Below 70% suggests reviewing methods or timing. Above 85% means you could challenge yourself more.',
        icon: 'speedometer',
      },
      {
        title: 'Improving Efficiency',
        content:
          'Focus on quality over speed, use active recall techniques, and study when mentally fresh. Avoid passive reading - test yourself actively.',
        icon: 'bulb',
      },
    ],
    tips: [
      'Active recall beats passive reading',
      'Study when mentally fresh',
      'Use spaced intervals, not cramming',
      'Quality practice over quantity',
    ],
  },
};

export const InfoModal = memo(({ visible, type, onClose }: InfoModalProps) => {
  const colors = useColors();
  const screenHeight = Dimensions.get('window').height;

  const tipsContainerStyle = useMemo(
    () => [styles.tipsContainer, { borderTopColor: withOpacity(colors.shadow, 0.1) }],
    [colors.shadow]
  );

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(screenHeight);
  const modalScale = useSharedValue(0.9);

  // Get content for the current type
  const content = type ? INFO_CONTENT[type] : null;

  // Handle modal animations
  useEffect(() => {
    if (visible && content) {
      // Show modal
      backdropOpacity.value = withTiming(1, { duration: 300 });
      modalTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      modalScale.value = withSpring(1, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      // Hide modal
      backdropOpacity.value = withTiming(0, { duration: 200 });
      modalTranslateY.value = withTiming(screenHeight, { duration: 200 });
      modalScale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible, content, backdropOpacity, modalTranslateY, modalScale, screenHeight]);

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }, { scale: modalScale.value }],
  }));

  const handleClose = () => {
    lightFeedback();
    onClose();
  };

  const handleBackdropPress = () => {
    handleClose();
  };

  if (!visible || !content) {
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
                    {content.title}
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.subtitle}>
                    {content.subtitle}
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

              {/* Content */}
              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.contentContainer}
                bounces={true}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={false}
                scrollIndicatorInsets={{ right: 2 }}
                contentInsetAdjustmentBehavior="automatic"
                directionalLockEnabled={true}
                alwaysBounceVertical={true}
                scrollEnabled={true}
                overScrollMode="always"
                indicatorStyle="default"
              >
                {/* Extended subtitle content */}
                <ThemedText type="body" variant="secondary" style={styles.extendedSubtitle}>
                  {content.subtitle}
                </ThemedText>

                {/* Sections */}
                {content.sections.length > 0 && (
                  <View style={styles.sectionsContainer}>
                    {content.sections.map((section, index) => (
                      <View key={`section-${index}`} style={styles.section}>
                        <View style={styles.sectionHeader}>
                          {section.icon && (
                            <View
                              style={[
                                styles.sectionIcon,
                                { backgroundColor: colors.buttonOverlay },
                              ]}
                            >
                              <Ionicons name={section.icon} size={20} color={colors.tint} />
                            </View>
                          )}
                          <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
                            {section.title}
                          </ThemedText>
                        </View>
                        <ThemedText type="body" variant="secondary" style={styles.sectionContent}>
                          {section.content}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                {/* Tips */}
                {content.tips.length > 0 && (
                  <View style={tipsContainerStyle}>
                    <ThemedText type="heading3" weight="bold" style={styles.tipsTitle}>
                      💡 Pro Tips
                    </ThemedText>
                    {content.tips.map((tip, index) => (
                      <View key={`tip-${index}`} style={styles.tip}>
                        <View style={[styles.tipBullet, { backgroundColor: colors.tint }]} />
                        <ThemedText type="body" variant="secondary" style={styles.tipText}>
                          {tip}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

InfoModal.displayName = 'InfoModal';

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
    maxHeight: '70%',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: LAYOUT.OPACITY.LIGHT,
    shadowRadius: 12,
    elevation: LAYOUT.ELEVATION.MEDIUM,
    overflow: 'hidden',
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: 1,
    flexShrink: 0,
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
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    padding: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  extendedSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },
  sectionsContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  section: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
  },
  sectionContent: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
    marginLeft: LAYOUT.SPACING.LARGE + LAYOUT.SPACING.SMALL, // Align with title
  },
  tipsContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: 1,
  },
  tipsTitle: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingLeft: LAYOUT.SPACING.SMALL,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.SMALL, // Align with text baseline
  },
  tipText: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
  },
});
