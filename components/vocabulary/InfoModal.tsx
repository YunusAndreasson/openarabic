import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
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
  runOnJS,
} from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';
import { lightFeedback } from '@/utils/haptics';

import { ThemedText } from '../ThemedText';

export type InfoModalType =
  | 'streak'
  | 'activity'
  | 'mastery'
  | 'retrievability'
  | 'difficulty'
  | 'efficiency';

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
  streak: {
    title: 'Learning Streak',
    subtitle: 'Track your consistency and build momentum',
    sections: [
      {
        title: 'What is a streak?',
        content:
          'A streak counts consecutive days where you actively engage with vocabulary learning - either by adding new words while reading or reviewing existing words.',
        icon: 'calendar-outline',
      },
      {
        title: 'How it works',
        content:
          'Your streak increases by 1 each day you have learning activity. The activity dots show your last 7 days, with green dots indicating active days.',
        icon: 'trending-up-outline',
      },
      {
        title: 'Why streaks matter',
        content:
          'Consistent daily practice, even for just a few minutes, is more effective than long, infrequent study sessions. Streaks help build lasting learning habits.',
        icon: 'checkmark-circle-outline',
      },
    ],
    tips: [
      'Aim for at least 3-5 words per day to maintain your streak',
      'Even reviewing a few due words counts as activity',
      'Reading articles and adding new words is the best way to grow',
      'Consistency beats intensity - small daily efforts compound over time',
    ],
  },
  activity: {
    title: 'Learning Activity',
    subtitle: 'Monitor your daily learning progress',
    sections: [
      {
        title: 'What does this show?',
        content:
          'This chart displays your daily learning activity over the last 14 days, including new words added and reviews completed.',
        icon: 'bar-chart-outline',
      },
      {
        title: 'Reading the chart',
        content:
          'Blue bars represent new words added from reading articles. The green line shows review activity. Higher activity indicates more engaged learning.',
        icon: 'analytics-outline',
      },
      {
        title: 'Daily average',
        content:
          'Your daily average combines new words and reviews. A good target is 3-5 total activities per day for steady progress without overwhelming yourself.',
        icon: 'speedometer-outline',
      },
    ],
    tips: [
      'Balance adding new words with reviewing existing ones',
      'Consistent moderate activity beats sporadic intense sessions',
      'If your average is low, try reading more articles to discover new words',
      'High review days often follow periods of adding many new words',
    ],
  },
  mastery: {
    title: 'Mastery Progress',
    subtitle: "Track how well you're learning vocabulary",
    sections: [
      {
        title: 'What is mastery?',
        content:
          "Mastery represents words you can reliably recall. A word is considered mastered when you've successfully reviewed it multiple times with good retention.",
        icon: 'trophy-outline',
      },
      {
        title: "How it's calculated",
        content:
          'Using the FSRS algorithm, words are mastered when they reach "Review" state with stability ≥5 days, meaning you can remember them for at least 5 days.',
        icon: 'calculator-outline',
      },
      {
        title: 'The mastery curve',
        content:
          'The chart shows your mastery percentage over time. Steady upward trends indicate effective learning. Plateaus suggest you need more review practice.',
        icon: 'trending-up-outline',
      },
    ],
    tips: [
      'Focus on quality reviews rather than rushing through them',
      "If mastery isn't growing, spend more time on difficult words",
      'A healthy mastery rate is 60-80% for active learners',
      "Don't worry about temporary dips - they're normal during learning",
    ],
  },
  retrievability: {
    title: 'Memory Retention Forecast',
    subtitle: "Predict when you'll forget words",
    sections: [
      {
        title: 'What is retrievability?',
        content:
          'Retrievability predicts how likely you are to remember a word right now, based on when you last reviewed it and how well you knew it.',
        icon: 'bulb-outline',
      },
      {
        title: 'The science behind it',
        content:
          'Uses the FSRS algorithm to calculate memory decay over time. The red line at 70% shows the critical threshold - below this, you should review soon.',
        icon: 'flask-outline',
      },
      {
        title: 'Future predictions',
        content:
          'The forecast shows how your overall retention will change over the next 30 days, helping you plan review sessions before forgetting occurs.',
        icon: 'time-outline',
      },
    ],
    tips: [
      'Review words before they drop below 70% retention',
      'Words with higher difficulty decay faster and need more frequent review',
      'The forecast helps you plan study sessions in advance',
      'Consistent reviewing prevents the "forgetting curve" from being too steep',
    ],
  },
  difficulty: {
    title: 'Difficulty Distribution',
    subtitle: 'Understand your vocabulary challenge levels',
    sections: [
      {
        title: 'How difficulty is measured',
        content:
          'Each word gets a difficulty score (1-10) based on how often you struggle with it. This uses the FSRS algorithm to track your personal learning patterns.',
        icon: 'speedometer-outline',
      },
      {
        title: 'The five levels',
        content:
          'Very Easy (1-3): Words you know well. Easy (3-5): Comfortable words. Medium (5-7): Moderate challenge. Hard (7-9): Frequent mistakes. Very Hard (9-10): Consistently difficult.',
        icon: 'layers-outline',
      },
      {
        title: 'Balanced learning',
        content:
          'A healthy distribution has most words in Easy-Medium range, with fewer Very Hard words. Too many hard words can be overwhelming.',
        icon: 'scale-outline',
      },
    ],
    tips: [
      'Focus extra attention on "Very Hard" words with targeted practice',
      'If you have too many hard words, slow down adding new vocabulary',
      'Easy words still need occasional review to maintain mastery',
      'Difficulty can decrease over time with consistent practice',
    ],
  },
  efficiency: {
    title: 'Learning Efficiency',
    subtitle: "Measure how effectively you're studying",
    sections: [
      {
        title: 'What is learning efficiency?',
        content:
          'Efficiency measures how well your study time translates into actual learning progress. It considers multiple factors like retention, difficulty management, and review success.',
        icon: 'rocket-outline',
      },
      {
        title: "How it's calculated",
        content:
          'Uses a 4-factor scoring system: State Progression (40%), Stability Quality (30%), Lapse Rate (20%), and Difficulty Balance (10%). Higher scores mean more effective learning.',
        icon: 'calculator-outline',
      },
      {
        title: 'Efficiency trends',
        content:
          'The chart shows your efficiency over time. Improving trends suggest your study methods are working. Declining efficiency may indicate you need to adjust your approach.',
        icon: 'trending-up-outline',
      },
    ],
    tips: [
      'Aim for 70%+ efficiency for optimal learning',
      'Low efficiency often means rushing through reviews',
      'Take time to really think about each word during reviews',
      'If efficiency drops, consider reviewing fewer words but more carefully',
    ],
  },
};

export const InfoModal = memo(({ visible, type, onClose }: InfoModalProps) => {
  const colors = useColors();
  const screenHeight = Dimensions.get('window').height;

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
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View style={[styles.modalContainer, modalStyle]}>
              <View style={[styles.modal, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View
                  style={[
                    styles.header,
                    { borderBottomColor: withOpacity(colors.textTertiary, 0.1) },
                  ]}
                >
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
                    style={[
                      styles.closeButton,
                      { backgroundColor: withOpacity(colors.textTertiary, 0.1) },
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                  style={styles.content}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.contentContainer}
                >
                  {/* Main sections */}
                  {content.sections.map((section, index) => (
                    <View key={`section-${index}`} style={styles.section}>
                      <View style={styles.sectionHeader}>
                        {section.icon && (
                          <View
                            style={[
                              styles.sectionIconContainer,
                              { backgroundColor: withOpacity(colors.tint, 0.1) },
                            ]}
                          >
                            <Ionicons name={section.icon} size={18} color={colors.tint} />
                          </View>
                        )}
                        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
                          {section.title}
                        </ThemedText>
                      </View>
                      <ThemedText type="body" variant="secondary" style={styles.sectionContent}>
                        {section.content}
                      </ThemedText>
                    </View>
                  ))}

                  {/* Tips section */}
                  <View
                    style={[
                      styles.tipsSection,
                      {
                        backgroundColor: withOpacity(colors.success, 0.05),
                        borderColor: withOpacity(colors.success, 0.2),
                      },
                    ]}
                  >
                    <View style={styles.tipsHeader}>
                      <View
                        style={[
                          styles.tipsIconContainer,
                          { backgroundColor: withOpacity(colors.success, 0.15) },
                        ]}
                      >
                        <Ionicons name="bulb-outline" size={18} color={colors.success} />
                      </View>
                      <ThemedText type="heading3" weight="semibold" style={styles.tipsTitle}>
                        Pro Tips
                      </ThemedText>
                    </View>
                    {content.tips.map((tip, index) => (
                      <View key={`tip-${index}`} style={styles.tipItem}>
                        <View style={[styles.tipBullet, { backgroundColor: colors.success }]} />
                        <ThemedText type="body" variant="secondary" style={styles.tipText}>
                          {tip}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

InfoModal.displayName = 'InfoModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.XLARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: LAYOUT.SPACING.XLARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  section: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  sectionTitle: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.3,
  },
  sectionContent: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
    marginLeft: 48, // Align with title text
  },
  tipsSection: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    padding: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  tipsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  tipsTitle: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.3,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: LAYOUT.SPACING.MEDIUM,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
  },
});
