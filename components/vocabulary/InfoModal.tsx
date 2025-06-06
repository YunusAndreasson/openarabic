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

import { Colors } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

import { ThemedText } from '../ThemedText';

export type InfoModalType =
  'efficiency' | 'mastery' | 'progress' | 'recommendation' | 'retrievability';

interface InfoModalProps {
  visible: boolean;
  type: InfoModalType | null;
  onClose: () => void;
}

interface InfoContent {
  title: string;
  subtitle: string;
  sections: {
    title: string;
    content: string;
    icon?: keyof typeof Ionicons.glyphMap;
  }[];
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
  mastery: {
    title: 'Memory Strength',
    subtitle:
      'How well you remember each word over time. This tracks your vocabulary retention and shows which words have moved from learning to long-term memory.',
    sections: [
      {
        title: 'Memory Levels',
        content:
          'New: Just learned, frequent review needed\\nLearning: Building memory, review every few days\\nStrong: Solid memory, minimal review\\n\\nWords progress through stages as you practice.',
        icon: 'school',
      },
      {
        title: 'Strength Percentage',
        content:
          'Your current overall memory strength.\n\nHigher = stronger retention\nLower = more review needed\n\nAim for steady improvement over time.',
        icon: 'trending-up',
      },
      {
        title: 'Strong Count',
        content:
          'Words you have moved to long-term memory.\\n\\nThese require minimal review and are ready for use.\\nClick to see your strong words.\\n\\nThis represents real learning progress.',
        icon: 'checkmark-circle',
      },
    ],
    tips: [
      'Steep climbs show effective learning',
      'Plateaus are normal - stay consistent',
      'Focus on quality recall over speed',
      'Use context for better retention',
    ],
  },
  retrievability: {
    title: 'Memory Retention',
    subtitle:
      'How long you remember words without practice. This predicts which words you are likely to forget and need review soon.',
    sections: [
      {
        title: 'Memory Decay',
        content:
          'All memories naturally fade without reinforcement.\n\nFresh memories decay quickly\nReviewed memories last longer\nWell-learned words resist forgetting\n\nSpaced repetition fights this process.',
        icon: 'time',
      },
      {
        title: 'Fading Words',
        content:
          'Words approaching the forgetting threshold.\n\nThese need review soon to prevent loss.\nClick to see which words are fading.\n\nReview before forgetting is more efficient.',
        icon: 'warning-outline',
      },
      {
        title: 'Retention Percentage',
        content:
          'Predicted percentage of words you will remember.\n\nHigher = strong memory\nLower = review needed\n\nThis forecast helps prioritize study time.',
        icon: 'shield',
      },
    ],
    tips: [
      'Review just before forgetting for strongest memories',
      'Green zones show stable retention',
      'Red zones need immediate review',
      'Consistent practice prevents steep drops',
    ],
  },
  efficiency: {
    title: 'Learning Speed',
    subtitle:
      'How quickly you master new vocabulary. This measures your learning velocity and helps optimize your study approach.',
    sections: [
      {
        title: 'Learning Speed',
        content:
          'How fast you move words from new to strong.\\n\\nFaster learning means:\\nBetter focus during study\\nEffective review timing\\nOptimal difficulty level',
        icon: 'speedometer',
      },
      {
        title: 'Speed Factors',
        content:
          'What affects your learning speed:\n\nWord difficulty vs your level\nQuality of attention during review\nSpacing between sessions\nPersonal energy and focus',
        icon: 'settings',
      },
      {
        title: 'Improvement Tips',
        content:
          'To increase learning speed:\n\nStudy when mentally fresh\nUse active recall techniques\nConnect new words to known concepts\nPractice in varied contexts',
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
  progress: {
    title: 'Learning Progress',
    subtitle:
      'Your vocabulary journey across different learning stages.\n\nThese stats show how words move through your memory system from initial learning to long-term strength.',
    sections: [
      {
        title: 'Due Words (Red)',
        content:
          "Words ready for review right now.\n\nWhy they matter:\nThese words are at the optimal spacing interval for strengthening memory\nDelaying review causes memory decay and forces relearning\nReviewing on time builds stronger, longer-lasting memories\n\nWhat to do:\nPrioritize these in your study session - they're your highest-impact practice.",
        icon: 'alarm-outline',
      },
      {
        title: 'Learning Words (Blue)',
        content:
          "Words you're actively building memory for.\n\nWhy they matter:\nThese are in the critical formation stage of memory\nRegular practice moves them toward strength\nSkipping practice sends them back to the beginning\n\nWhat to do:\nMaintain consistent practice to keep these progressing forward.",
        icon: 'school-outline',
      },
      {
        title: 'Strong Words (Green)',
        content:
          "Words that have reached long-term memory.\n\nWhy they matter:\nThese represent real learning achievement - vocabulary you truly own\nThey require minimal review and are ready for natural use\nThis is your measure of actual progress\n\nWhat to do:\nCelebrate this number - it's your real vocabulary growth!",
        icon: 'checkmark-circle-outline',
      },
      {
        title: 'Struggling Words (Red)',
        content:
          'Words that consistently challenge you.\n\nWhy they matter:\nThese need special attention to break through difficulty barriers\nIgnoring them creates permanent knowledge gaps\nFocused practice can turn struggles into strengths\n\nWhat to do:\nDedicate extra time to these - breakthrough is often just one good session away.',
        icon: 'alert-circle',
      },
    ],
    tips: [
      'Due words are your highest-impact practice - prioritize them',
      'Learning words need consistent practice to progress',
      'Strong count is your true measure of vocabulary growth',
      'Struggling words become strengths with focused attention',
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
                    {content.title}
                  </ThemedText>
                  <ThemedText style={styles.subtitle} type="body" variant="secondary">
                    {content.subtitle}
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

              {/* Content */}
              <ScrollView
                alwaysBounceVertical={true}
                bounces={true}
                contentContainerStyle={styles.contentContainer}
                contentInsetAdjustmentBehavior="automatic"
                directionalLockEnabled={true}
                indicatorStyle="default"
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={false}
                overScrollMode="always"
                scrollEnabled={true}
                scrollEventThrottle={16}
                scrollIndicatorInsets={{ right: 2 }}
                showsVerticalScrollIndicator={true}
                style={styles.content}
              >
                {/* Extended subtitle content */}
                <ThemedText style={styles.extendedSubtitle} type="body" variant="secondary">
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
                              <Ionicons color={colors.tint} name={section.icon} size={20} />
                            </View>
                          )}
                          <ThemedText style={styles.sectionTitle} type="heading3" weight="bold">
                            {section.title}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.sectionContent} type="body" variant="secondary">
                          {section.content}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                {/* Tips */}
                {content.tips.length > 0 && (
                  <View style={tipsContainerStyle}>
                    <ThemedText style={styles.tipsTitle} type="heading3" weight="bold">
                      💡 Pro Tips
                    </ThemedText>
                    {content.tips.map((tip, index) => (
                      <View key={`tip-${index}`} style={styles.tip}>
                        <View style={[styles.tipBullet, { backgroundColor: colors.tint }]} />
                        <ThemedText style={styles.tipText} type="body" variant="secondary">
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
  closeButton: {
    alignItems: 'center',
    flexShrink: 0,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  content: {
    backgroundColor: Colors.light.transparent,
    flex: 1,
  },
  contentContainer: {
    padding: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingRight: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  extendedSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexShrink: 0,
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  modal: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    display: 'flex',
    elevation: LAYOUT.ELEVATION.MEDIUM,
    maxHeight: '70%',
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
  section: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  sectionContent: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
    marginLeft: LAYOUT.SPACING.LARGE + LAYOUT.SPACING.SMALL, // Align with title
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
    width: 32,
  },
  sectionTitle: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
  },
  sectionsContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.LARGE,
  },
  subtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  tip: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingLeft: LAYOUT.SPACING.SMALL,
  },
  tipBullet: {
    borderRadius: 3,
    height: 6,
    marginRight: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
    width: 6, // Align with text baseline
  },
  tipText: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
  },
  tipsContainer: {
    borderTopWidth: 1,
    marginTop: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  tipsTitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  title: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.2,
    marginBottom: LAYOUT.SPACING.XSMALL,
  },
});
