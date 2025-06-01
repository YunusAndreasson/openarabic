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
    title: 'What To Do Next',
    subtitle:
      'Your personalized study guidance based on spaced repetition science and cognitive load theory.\n\nThe system analyzes your review load and memory patterns to determine the optimal next action for maximum learning efficiency.',
    sections: [
      {
        title: 'Review First',
        content:
          'This appears when you have 15+ overdue words or >25% of your deck is due.\n\nWhy this matters:\nYour brain can only process limited new information when working memory is occupied with overdue reviews. Adding new words now creates cognitive overload and reduces retention.\n\nWhat to do:\nStop adding new words. Complete all overdue reviews first. This clears your mental workspace and maximizes learning capacity for new vocabulary.',
        icon: 'stop-circle',
      },
      {
        title: 'Review Then Add',
        content:
          'This appears when you have 5-15 due words with moderate review load.\n\nWhy this matters:\nYou have some review burden but your brain can still handle new information. The key is sequencing - reviews first, then new words.\n\nWhat to do:\nPause new word addition. Complete your due reviews first, then add a few new words. This maintains strong retention while allowing controlled growth.',
        icon: 'pause-circle',
      },
      {
        title: 'Add New Words',
        content:
          'This appears when you have minimal review load and optimal learning conditions.\n\nWhy this matters:\nYour brain has maximum capacity for new learning. This is the perfect time to expand your vocabulary without compromising retention.\n\nWhat to do:\nGo ahead and add new words. Your memory system is ready for new learning. Focus on quality over quantity.',
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
    title: 'Daily Habit',
    subtitle:
      'Your consistency in daily vocabulary practice.\n\nDaily practice is the foundation of effective spaced repetition. Even 5 minutes daily beats sporadic long sessions.',
    sections: [
      {
        title: 'Current Streak',
        content:
          'Days in a row you have practiced vocabulary.\n\nWhy it matters:\nConsistent daily practice creates neural pathways that make learning automatic. Your brain adapts to expect and process new information at regular intervals.\n\nBuilding streaks:\nStart small with just 5 words per day. Consistency beats intensity. Missing one day breaks the streak, but you can always start fresh.',
        icon: 'flame',
      },
      {
        title: 'Activity Timeline',
        content:
          'Visual representation of your last 7 days of practice.\n\nGreen dots show active days\nYellow dots show missed days\nConnected dots show consecutive practice\n\nUse this to identify patterns in your study habits and maintain momentum.',
        icon: 'analytics',
      },
      {
        title: 'Best Streak',
        content:
          'Your longest consecutive practice period.\n\nThis shows your capability for sustained learning. Use it as motivation to beat your personal record.\n\nRemember: Every expert was once a beginner who refused to give up.',
        icon: 'trophy',
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
    title: 'Memory Strength',
    subtitle:
      'How well you remember each word over time.\n\nThis tracks your vocabulary retention and shows which words have moved from learning to long-term memory.',
    sections: [
      {
        title: 'Memory Strength Levels',
        content:
          'New: Just learned, needs frequent review\nLearning: Building memory, review every few days\nMastered: Strong memory, review weekly or less\n\nWords progress through these stages as you practice. The goal is moving words to mastered status.',
        icon: 'school',
      },
      {
        title: 'Strength Percentage',
        content:
          'Shows your current overall memory strength across all words.\n\nHigher percentages mean stronger retention\nLower percentages indicate need for more review\n\nAim for steady improvement over time rather than perfection.',
        icon: 'trending-up',
      },
      {
        title: 'Mastered Count',
        content:
          'Total words you have moved to long-term memory.\n\nThese words require minimal review and are available for natural use\nClick to see your mastered word list\n\nCelebrate this number - it represents real learning progress.',
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
    title: 'Memory Decay',
    subtitle:
      'How long you remember words without practice.\n\nThis predicts which words you are likely to forget and need review soon.',
    sections: [
      {
        title: 'Memory Decay Process',
        content:
          'All memories naturally fade over time without reinforcement.\n\nFresh memories decay quickly\nReviewed memories last longer\nWell-learned words resist forgetting\n\nSpaced repetition fights this natural process.',
        icon: 'time',
      },
      {
        title: 'Fading Words',
        content:
          'Words approaching the forgetting threshold.\n\nThese need review soon to prevent memory loss\nClick to see which specific words are fading\n\nReviewing before forgetting is more efficient than relearning.',
        icon: 'warning-outline',
      },
      {
        title: 'Retention Percentage',
        content:
          'Predicted percentage of words you will remember.\n\nHigher percentages indicate strong memory\nLower percentages suggest review needed\n\nThis forecast helps prioritize study time.',
        icon: 'shield',
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
    title: 'Challenge Level',
    subtitle:
      'Which words are hardest for you to remember.\n\nThis identifies your learning challenges and helps focus your effort where it matters most.',
    sections: [
      {
        title: 'Difficulty Categories',
        content:
          'Easy: Quick to learn and remember\nMedium: Moderate effort required\nStruggling: Need extra attention and practice\n\nEveryone has different difficulty patterns based on background and learning style.',
        icon: 'bar-chart',
      },
      {
        title: 'Struggling Words',
        content:
          'Words that consistently challenge you.\n\nThese may need:\nMore frequent review\nDifferent learning techniques\nAdditional context or examples\n\nClick bars to explore specific difficulty levels.',
        icon: 'alert-circle',
      },
      {
        title: 'Difficulty Balance',
        content:
          'Ideal vocabulary has mixed difficulty levels:\n\nToo easy: Limited growth\nToo struggling: Overwhelming\nBalanced: Optimal challenge\n\nAdjust your word selection based on this distribution.',
        icon: 'scale',
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
    title: 'Learning Speed',
    subtitle:
      'How quickly you master new vocabulary.\n\nThis measures your learning velocity and helps optimize your study approach.',
    sections: [
      {
        title: 'Learning Speed',
        content:
          'How fast you move words from new to mastered status.\n\nFaster learning means:\nBetter focus during study\nEffective review timing\nOptimal difficulty level\n\nSlow learning suggests need for strategy adjustment.',
        icon: 'speedometer',
      },
      {
        title: 'Speed Factors',
        content:
          'Several factors affect your learning speed:\n\nWord difficulty relative to your level\nQuality of attention during review\nSpacing between review sessions\nPersonal energy and focus\n\nOptimize these for better efficiency.',
        icon: 'settings',
      },
      {
        title: 'Improvement Tips',
        content:
          'To increase learning speed:\n\nStudy when mentally fresh\nUse active recall techniques\nConnect new words to known concepts\nPractice in varied contexts\n\nConsistency beats cramming for speed.',
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
