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
    subtitle:
      'Tracks consecutive days with vocabulary activity (reading articles, reviewing words, practice sessions).\n\nDaily practice creates stronger neural pathways and improves retention by up to 400% compared to cramming.\n\nStart small with 2-3 words daily and link practice to existing routines.',
    sections: [],
    tips: [],
  },
  activity: {
    title: 'Learning Activity',
    subtitle:
      'Blue bars show new words discovered from reading articles.\n\nGreen line shows words reviewed to strengthen memory.\n\nAim for 1 new word to 3 reviews for optimal retention. Consistent moderate activity beats sporadic intense sessions.\n\nTarget 3-7 total activities daily.',
    sections: [],
    tips: [],
  },
  mastery: {
    title: 'Vocabulary Mastery',
    subtitle:
      'Shows words you can recall automatically - those in Review state with ≥5 days stability where your brain can access them reliably.\n\nThe upward curve shows vocabulary becoming automatic over time. Steep climbs indicate effective learning periods.\n\nTarget 60-80% mastery rate for optimal learning and focus on depth over breadth.',
    sections: [],
    tips: [],
  },
  retrievability: {
    title: 'Memory Retention',
    subtitle:
      "Predicts when you'll forget words by showing when each word will drop below 70% retention - the optimal review point.\n\nThis threshold is high enough for successful recall, low enough for memory strengthening.\n\nReview words approaching 70% retention and plan study sessions 1-2 days before predicted drops.",
    sections: [],
    tips: [],
  },
  difficulty: {
    title: 'Word Difficulty',
    subtitle:
      'Shows your personal learning challenge levels:\nVery Easy (1-3), Easy (3-5), Medium (5-7), Hard (7-9), Very Hard (9-10).\n\nKeep 60-70% of vocabulary in Easy-Medium range for sustainable learning.\n\nToo many hard words create mental fatigue, so use easy words as confidence builders.',
    sections: [],
    tips: [],
  },
  efficiency: {
    title: 'Learning Efficiency',
    subtitle:
      'Measures how effectively your study time converts to lasting memory improvements.\n\nTarget 70-85% efficiency - below 70% suggests reviewing methods, above 85% means you could challenge yourself more.\n\nFocus on quality over speed, use active recall before seeing answers, and study when mentally fresh.',
    sections: [],
    tips: [],
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
          <Animated.View style={[styles.modalContainer, modalStyle]} pointerEvents="box-none">
            <View
              style={[styles.modal, { backgroundColor: colors.background }]}
              pointerEvents="auto"
            >
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
    maxHeight: '70%',
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
});
