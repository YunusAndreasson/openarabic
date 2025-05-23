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
    subtitle: 'Build consistent habits that accelerate language acquisition',
    sections: [
      {
        title: 'The Science of Streaks',
        content:
          'Learning streaks leverage the psychological principle of "habit stacking" and the neurological benefits of spaced repetition. When you maintain daily vocabulary practice, your brain creates stronger neural pathways and improves long-term retention by up to 400% compared to cramming sessions.',
        icon: 'calendar-outline',
      },
      {
        title: 'How Streaks Work in Language Learning',
        content:
          'Your streak counts consecutive days with meaningful vocabulary engagement: adding words from reading, reviewing due cards, or completing practice sessions. The activity dots visualize your consistency pattern - green dots show active days, helping you identify your most productive learning periods.',
        icon: 'trending-up-outline',
      },
      {
        title: 'Why Daily Practice Transforms Learning',
        content:
          'Research shows that 15-20 minutes of daily vocabulary practice is more effective than 2-3 hour weekly sessions. Daily exposure prevents the "forgetting curve" - the rapid loss of new information. Consistent practice also builds automaticity, making word recall effortless over time.',
        icon: 'checkmark-circle-outline',
      },
      {
        title: 'The Compound Effect',
        content:
          'Each day of your streak builds on the previous day. A 30-day streak with just 5 words daily results in 150 new words, but more importantly, it establishes vocabulary learning as an automatic habit. This compound effect accelerates your overall language proficiency exponentially.',
        icon: 'rocket-outline',
      },
    ],
    tips: [
      'Start small: Even 2-3 words daily builds the habit foundation',
      'Link vocabulary practice to existing routines (morning coffee, commute)',
      'Use "streak insurance" - if you miss a day, get back immediately',
      'Track your longest streak as motivation during difficult periods',
      'Celebrate milestone streaks (7, 30, 100 days) to maintain momentum',
      'Quality over quantity: Better to learn 3 words well than 10 poorly',
    ],
  },
  activity: {
    title: 'Learning Activity Analytics',
    subtitle: 'Optimize your vocabulary acquisition through data-driven insights',
    sections: [
      {
        title: 'Understanding Your Learning Patterns',
        content:
          'This comprehensive activity chart tracks two critical learning behaviors: vocabulary discovery (blue bars) from reading articles and knowledge reinforcement (green line) through reviews. The interplay between these activities determines your overall language acquisition rate and retention quality.',
        icon: 'bar-chart-outline',
      },
      {
        title: 'The Optimal Learning Ratio',
        content:
          'Research in second language acquisition suggests an ideal ratio of 1:3 between new words and reviews. For every new word you add, you should complete about 3 reviews. This chart helps you visualize this balance - if you see high blue bars without corresponding green line activity, you may be overwhelming your memory capacity.',
        icon: 'analytics-outline',
      },
      {
        title: 'Daily Average: Your Learning Velocity',
        content:
          'Your daily average represents your "learning velocity" - the rate at which you\'re expanding and consolidating vocabulary. A sustainable target is 3-7 total activities daily: 1-2 new words plus 2-5 reviews. Higher averages indicate intensive learning periods, while lower averages suggest maintenance phases.',
        icon: 'speedometer-outline',
      },
      {
        title: 'Activity Patterns and Learning Efficiency',
        content:
          'Consistent moderate activity (steady bars and lines) typically produces better long-term retention than sporadic intense sessions (high spikes followed by gaps). The chart reveals your natural learning rhythm and helps identify optimal times for vocabulary work.',
        icon: 'pulse-outline',
      },
    ],
    tips: [
      'Aim for consistent daily activity rather than weekend cramming sessions',
      'If new word bars are consistently higher than review lines, slow down acquisition',
      'Use low-activity days for reviewing difficult words rather than adding new ones',
      'Track weekly patterns to identify your most productive learning days',
      'Balance reading-heavy days (high blue bars) with review-focused days (high green line)',
      'Consider your daily average when setting realistic vocabulary goals',
    ],
  },
  mastery: {
    title: 'Vocabulary Mastery Progression',
    subtitle: 'Track your journey from recognition to automatic recall',
    sections: [
      {
        title: 'The Four Stages of Word Mastery',
        content:
          'Vocabulary mastery follows a predictable progression: Recognition (seeing/hearing a word and understanding it), Recall (remembering the word when prompted), Production (using the word in speech/writing), and Automaticity (effortless, instant access). This chart tracks your progression through these stages using advanced memory science.',
        icon: 'trophy-outline',
      },
      {
        title: 'FSRS Algorithm: Personalized Memory Modeling',
        content:
          'The Free Spaced Repetition Scheduler (FSRS) algorithm creates a personalized model of your memory. Words achieve "mastery" status when they reach Review state with ≥5 days stability, meaning your brain can reliably access them for nearly a week without practice. This indicates strong neural pathway formation.',
        icon: 'calculator-outline',
      },
      {
        title: 'Reading the Mastery Curve',
        content:
          'The upward trend shows your vocabulary becoming more automatic over time. Steep climbs indicate effective learning periods, while plateaus suggest you need more review practice or are adding words too quickly. Temporary dips are normal when adding challenging vocabulary - your brain is reorganizing knowledge.',
        icon: 'trending-up-outline',
      },
      {
        title: 'Mastery vs. Exposure: Quality Learning',
        content:
          "A 60-80% mastery rate indicates optimal learning - you're challenging yourself without overwhelming your memory capacity. Lower rates suggest slowing down new word acquisition; higher rates might mean you're ready for more challenging vocabulary or can increase your learning pace.",
        icon: 'school-outline',
      },
    ],
    tips: [
      'Focus on depth over breadth: truly master words rather than just recognizing them',
      'If mastery percentage drops, prioritize reviewing over adding new words',
      'Celebrate mastery milestones - each mastered word represents significant neural development',
      'Use mastered words actively in speaking/writing to maintain automaticity',
      "Don't worry about temporary mastery dips when learning challenging vocabulary",
      'A healthy mastery curve shows steady, sustainable growth over months',
    ],
  },
  retrievability: {
    title: 'Memory Retention Science',
    subtitle: 'Predict and prevent vocabulary forgetting using cognitive science',
    sections: [
      {
        title: 'The Forgetting Curve Phenomenon',
        content:
          'Discovered by psychologist Hermann Ebbinghaus, the forgetting curve shows that we lose 50% of new information within 24 hours and 90% within a week without review. Retrievability predicts exactly when each word will cross critical memory thresholds, allowing you to intervene before forgetting occurs.',
        icon: 'bulb-outline',
      },
      {
        title: 'Personalized Memory Decay Modeling',
        content:
          "The FSRS algorithm creates individual forgetting curves for each word based on your personal learning patterns. Factors include: your review history, response accuracy, word difficulty, and time intervals. This creates precise predictions about when you'll forget specific vocabulary items.",
        icon: 'flask-outline',
      },
      {
        title: 'The 70% Retention Threshold',
        content:
          'Cognitive research shows that 70% retrievability is the optimal review point - high enough to ensure successful recall, low enough to provide beneficial memory strengthening. Reviewing above 90% wastes time; below 50% risks failure and negative learning experiences.',
        icon: 'time-outline',
      },
      {
        title: 'Proactive vs. Reactive Learning',
        content:
          'This forecast transforms you from reactive (reviewing after forgetting) to proactive (reviewing before forgetting). The 30-day prediction helps you plan study sessions, balance workload, and maintain consistent retention across your entire vocabulary without overwhelming daily review loads.',
        icon: 'eye-outline',
      },
    ],
    tips: [
      'Review words when they approach 70% retention for optimal memory strengthening',
      'Use the forecast to plan lighter study days when many words need review',
      'Words dropping below 50% retention require immediate attention',
      'High-difficulty words decay faster and need more frequent review cycles',
      'Plan review sessions 1-2 days before predicted retention drops',
      'Consistent reviewing prevents the "avalanche effect" of forgotten vocabulary',
    ],
  },
  difficulty: {
    title: 'Personalized Difficulty Assessment',
    subtitle: 'Understand your unique vocabulary learning challenges and strengths',
    sections: [
      {
        title: 'Individual Learning Fingerprint',
        content:
          'Every learner has a unique "difficulty fingerprint" - patterns of which words are easy or hard based on personal background, native language, learning style, and cognitive preferences. This chart maps your individual learning landscape, showing which vocabulary types challenge you most.',
        icon: 'speedometer-outline',
      },
      {
        title: 'The Five Difficulty Levels Explained',
        content:
          'Very Easy (1-3): Words you grasp immediately, often cognates or familiar concepts. Easy (3-5): Comfortable vocabulary requiring minimal practice. Medium (5-7): Standard learning challenge with moderate effort. Hard (7-9): Words requiring focused attention and multiple exposures. Very Hard (9-10): Persistent challenges needing specialized strategies.',
        icon: 'layers-outline',
      },
      {
        title: 'Cognitive Load and Learning Efficiency',
        content:
          'Your difficulty distribution reveals your cognitive load balance. Too many hard words create overwhelming mental burden, reducing learning efficiency. An optimal distribution has most words in Easy-Medium range, allowing you to tackle challenging vocabulary without mental fatigue.',
        icon: 'scale-outline',
      },
      {
        title: 'Dynamic Difficulty: Words Change Over Time',
        content:
          "Word difficulty isn't fixed - it evolves with your learning. Initially hard words become easier through practice, while easy words might become harder if neglected. This dynamic system helps you understand which vocabulary needs attention and which has become automatic.",
        icon: 'refresh-outline',
      },
    ],
    tips: [
      'Maintain 60-70% of vocabulary in Easy-Medium range for sustainable learning',
      'Give extra attention to Very Hard words with mnemonic devices and context',
      'If too many words are Hard/Very Hard, slow down new vocabulary acquisition',
      'Use Easy words as confidence builders during challenging learning periods',
      'Create targeted practice sessions for words in specific difficulty ranges',
      'Celebrate when Hard words move to Medium - it shows real progress',
    ],
  },
  efficiency: {
    title: 'Learning Efficiency Optimization',
    subtitle: 'Maximize your vocabulary acquisition through scientific study methods',
    sections: [
      {
        title: 'The Four Pillars of Learning Efficiency',
        content:
          'Learning efficiency measures how effectively your study time converts into lasting knowledge. Our algorithm evaluates four key factors: State Progression (40% weight) - how well words advance through learning stages; Stability Quality (30%) - how long memories last; Lapse Rate (20%) - how often you forget; and Difficulty Balance (10%) - optimal challenge level.',
        icon: 'rocket-outline',
      },
      {
        title: 'Efficiency vs. Speed: Quality Learning',
        content:
          "High efficiency doesn't mean fast learning - it means effective learning. A 75% efficiency score indicates that three-quarters of your study time produces lasting memory improvements. Low efficiency often results from rushing through reviews, not engaging deeply with words, or studying when mentally fatigued.",
        icon: 'calculator-outline',
      },
      {
        title: 'The Efficiency Sweet Spot',
        content:
          "Research shows 70-85% efficiency as optimal for vocabulary learning. Below 70% suggests reviewing study methods; above 85% might indicate you're not challenging yourself enough. The chart reveals efficiency patterns, helping you identify when you learn most effectively.",
        icon: 'trending-up-outline',
      },
      {
        title: 'Metacognitive Learning Strategies',
        content:
          'Efficiency improvements come from metacognition - thinking about how you think. High-efficiency learners use strategies like: elaborative rehearsal (connecting words to personal experiences), dual coding (visual and verbal memory), and distributed practice (spacing reviews over time).',
        icon: 'library-outline',
      },
    ],
    tips: [
      'Target 70-80% efficiency for optimal learning without overwhelming yourself',
      'Low efficiency often means rushing - take time to truly process each word',
      'Use active recall: try to remember words before seeing answers',
      'Connect new vocabulary to personal experiences for deeper encoding',
      'Study when mentally fresh - efficiency drops significantly when tired',
      'If efficiency consistently drops, consider reducing daily vocabulary load',
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
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.contentContainer}
                  bounces={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  scrollIndicatorInsets={{ right: 1 }}
                  contentInsetAdjustmentBehavior="automatic"
                  directionalLockEnabled={true}
                  alwaysBounceVertical={true}
                  scrollEnabled={true}
                  overScrollMode="always"
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
    pointerEvents: 'box-none',
  },
  modal: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    height: '50%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    display: 'flex',
    pointerEvents: 'auto',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.XLARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
    borderBottomWidth: 1,
    flexShrink: 0,
    pointerEvents: 'auto',
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
    flexShrink: 0,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
    pointerEvents: 'auto',
    zIndex: 1,
  },
  contentContainer: {
    padding: LAYOUT.SPACING.XLARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.XXLARGE,
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
    flexShrink: 0,
  },
  sectionTitle: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.3,
  },
  sectionContent: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
    marginLeft: 48,
  },
  tipsSection: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    padding: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
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
    flexShrink: 0,
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
  },
});
