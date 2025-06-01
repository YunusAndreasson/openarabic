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
    title: 'Recommendation',
    subtitle:
      'Your personalized study guidance based on spaced repetition science and cognitive load theory.\n\nThe system analyzes your review load and memory patterns to determine the optimal next action for maximum learning efficiency.',
    sections: [
      {
        title: 'Review First',
        content:
          'This appears when you have 15+ overdue words or >25% of your deck is due.\n\nWhy this matters:\nYour brain can only process limited new information when working memory is occupied with overdue reviews. Adding new words now creates cognitive overload and reduces retention.\n\nWhat to do:\nStop adding new words. Complete all overdue reviews first. This clears your mental workspace and prevents the forgetting curve from accelerating.',
        icon: 'stop-circle',
      },
      {
        title: 'Review Then Add',
        content:
          "This appears when you have 5-15 due words with moderate review load.\n\nWhy this matters:\nYou have a manageable review load that won't overwhelm your working memory, but clearing it first optimizes your brain for new learning.\n\nWhat to do:\nComplete your reviews first to reinforce existing memories. Then add 3-5 new words to maintain steady progress without overload.",
        icon: 'pause-circle',
      },
      {
        title: 'Add New Words',
        content:
          'This appears when you have few or no due words.\n\nWhy this matters:\nYour brain has maximum capacity for encoding new information. Your working memory is clear and ready for optimal learning.\n\nWhat to do:\nGo ahead and expand your vocabulary! Add 3-5 new words (5-10 when starting out). Your brain can dedicate full attention to forming new neural pathways.',
        icon: 'play-circle',
      },
    ],
    tips: [
      'Follow recommendations for 2-3x better retention rates',
      'Add 3-5 new words when optimal, 5-10 when starting out',
      'Consistency beats volume every time',
      'Review when mentally fresh for maximum effectiveness',
    ],
  },
  streak: {
    title: 'Consistency',
    subtitle:
      'This chart shows your daily vocabulary practice over the last 7 days with current and longest streak counts.\n\nConsistent daily practice strengthens neural pathways and improves retention by up to 400% compared to sporadic study sessions.',
    sections: [
      {
        title: 'Why Consistency Matters',
        content:
          'Daily practice, even just 2-3 words, builds stronger neural pathways than marathon study sessions.\n\nThe Science:\nYour brain consolidates memories during sleep through a process called memory consolidation. Daily exposure ensures information moves from short-term to long-term memory effectively.\n\nThe Result:\nRegular practice creates automatic recall - words become instantly accessible without conscious effort.',
        icon: 'calendar',
      },
      {
        title: 'Building Habits',
        content:
          'Link vocabulary practice to existing routines like morning coffee, commute, or before bed.\n\nWhy This Works:\nHabit stacking leverages existing neural pathways to create new ones. Your brain already has strong cues for your existing routine.\n\nThe Compound Effect:\nSmall, consistent actions compound into significant progress over time. 5 minutes daily = 30+ hours annually.',
        icon: 'link',
      },
    ],
    tips: [
      'Practice 2-3 words daily to build momentum',
      'Link practice to existing daily routines',
      'Focus on consistency over perfection',
      'Celebrate small wins to maintain motivation',
    ],
  },
  mastery: {
    title: 'Mastery',
    subtitle:
      'This chart tracks how well you know each word over time, showing your mastery percentage.\n\nWords are considered mastered when you can recall them automatically with high confidence. The line shows your vocabulary becoming automatic over the past 14 days.',
    sections: [
      {
        title: 'Mastery Levels',
        content:
          'Words progress through four distinct stages:\n\nNew → Learning → Review → Mastered\n\nWhat Each Stage Means:\n• New: Just added, no memory trace yet\n• Learning: Building initial memory connections\n• Review: Strengthening existing memories\n• Mastered: Automatic recall, strong neural pathways\n\nMastered words require less frequent review because they have strong memory traces that resist forgetting.',
        icon: 'trending-up',
      },
      {
        title: 'Target Range',
        content:
          "Aim for 60-80% mastery rate for optimal learning.\n\nWhy This Range:\nThis balance ensures steady progress without overwhelming difficulty. It's challenging enough to promote growth but not so hard that it becomes frustrating.\n\nWhat Different Rates Mean:\n• Above 80%: You need more challenging content\n• 60-80%: Perfect learning zone\n• Below 60%: Review your study methods or reduce difficulty",
        icon: 'checkmark-circle',
      },
    ],
    tips: [
      'Steep climbs indicate effective learning periods',
      'Plateaus are normal - maintain consistency',
      'Focus on quality recall over speed',
      'Use context and associations for better retention',
    ],
  },
  retrievability: {
    title: 'Retention',
    subtitle:
      'This chart predicts your average memory strength for the next 14 days using spaced repetition science.\n\nIt shows when words will drop below optimal retention levels, helping you plan review sessions before forgetting occurs.',
    sections: [
      {
        title: 'Memory Strength',
        content:
          'The chart shows predicted memory strength as a percentage over time.\n\nThe 70% Threshold:\nThis is the optimal review timing - high enough for successful recall, low enough for memory strengthening through retrieval practice.\n\nWhy 70% Works:\nReviewing just before forgetting (the "desirable difficulty" zone) creates the strongest memory consolidation. Too early wastes time, too late risks forgetting.',
        icon: 'analytics-outline',
      },
      {
        title: 'Planning Reviews',
        content:
          'Use this forecast to plan your study sessions strategically.\n\nOptimal Timing:\nPlan study sessions 1-2 days before predicted drops below 70%. This prevents forgetting while maximizing memory consolidation.\n\nColor Zones:\n• Green: Stable retention, no immediate action needed\n• Yellow: Plan review within 2-3 days\n• Red: Review immediately to prevent forgetting',
        icon: 'time-outline',
      },
    ],
    tips: [
      'Review just before forgetting for strongest memories',
      'Green zones indicate stable retention',
      'Red zones require immediate review',
      'Consistent practice prevents steep drops',
    ],
  },
  difficulty: {
    title: 'Difficulty',
    subtitle:
      'This chart shows how challenging your vocabulary is across three levels: Easy, Medium, and Hard.\n\nIt displays the distribution of word difficulty based on your recall performance. Optimal distribution ensures sustainable learning without mental fatigue.',
    sections: [
      {
        title: 'Difficulty Levels',
        content:
          'Words are categorized based on your recall performance:\n\nEasy Words (Quick Recall):\nYou remember these instantly with minimal effort. They build confidence and fluency.\n\nMedium Words (Some Effort):\nRequire conscious recall but you usually get them right. These provide appropriate challenge.\n\nHard Words (Frequent Mistakes):\nYou often struggle or forget these. They require more attention but should be limited to prevent frustration.',
        icon: 'bar-chart',
      },
      {
        title: 'Target Balance',
        content:
          'Target 60-70% Easy-Medium range for sustainable learning.\n\nWhy This Balance:\nToo many hard words create cognitive overload and reduce motivation. Too many easy words provide insufficient challenge for growth.\n\nOptimal Distribution:\n• 40-50% Easy words (confidence builders)\n• 20-30% Medium words (growth zone)\n• 10-20% Hard words (challenge, but manageable)',
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
    title: 'Efficiency',
    subtitle:
      'This chart measures how effectively your study time converts to lasting memory over 14 days.\n\nBased on word progression, stability gains, and success rates, it shows whether your learning methods are working optimally.',
    sections: [
      {
        title: 'Target Range',
        content:
          'Target 70-85% efficiency for optimal learning.\n\nWhat Efficiency Means:\nThis measures how much lasting memory you create per minute of study time. Higher efficiency means better learning methods.\n\nInterpreting Your Score:\n• Below 70%: Review your methods or study timing\n• 70-85%: Excellent efficiency, maintain current approach\n• Above 85%: You can challenge yourself with harder content',
        icon: 'speedometer',
      },
      {
        title: 'Improving Efficiency',
        content:
          'Several factors impact your learning efficiency:\n\nStudy Quality:\nFocus on quality over speed. Use active recall techniques rather than passive reading.\n\nTiming:\nStudy when mentally fresh (usually mornings). Avoid studying when tired or distracted.\n\nMethod:\nTest yourself actively rather than just re-reading. Retrieval practice strengthens memory more than recognition.',
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
