// External Libraries
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useState, type FC } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

// FAQ item type
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// FAQ item component props
interface FAQItemComponentProps {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

// Minimal, robust FAQ item component
const FAQItemComponent: FC<FAQItemComponentProps> = memo(({ item, isExpanded, onToggle }) => {
  const colors = useColors();

  const handlePress = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    selectionFeedback();
    onToggle(item.id);
  }, [item.id, onToggle]);

  return (
    <View style={{ marginBottom: LAYOUT.SPACING.MEDIUM }}>
      <Pressable
        style={{
          backgroundColor: colors.card,
          borderColor: isExpanded ? colors.tint : colors.cardBorder,
          borderWidth: LAYOUT.BORDER.WIDTH.THIN,
          borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
          paddingHorizontal: LAYOUT.SPACING.LARGE,
          paddingVertical: LAYOUT.SPACING.LARGE,
        }}
        onPress={handlePress}
        android_ripple={{ color: colors.navigationRipple, borderless: false }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <ThemedText
            type="body"
            weight="medium"
            colorName={isExpanded ? 'tint' : 'text'}
            style={{ flex: 1, marginRight: LAYOUT.SPACING.MEDIUM }}
          >
            {item.question}
          </ThemedText>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={isExpanded ? colors.tint : colors.textTertiary}
          />
        </View>
      </Pressable>
      {isExpanded && (
        <View
          style={{
            backgroundColor: colors.background,
            borderColor: colors.cardBorder,
            borderWidth: LAYOUT.BORDER.WIDTH.THIN,
            borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
            paddingHorizontal: LAYOUT.SPACING.LARGE,
            paddingVertical: LAYOUT.SPACING.LARGE,
            marginTop: LAYOUT.SPACING.SMALL,
          }}
        >
          <ThemedText type="body" variant="secondary">
            {item.answer}
          </ThemedText>
        </View>
      )}
    </View>
  );
});
FAQItemComponent.displayName = 'FAQItemComponent';

// Main Help screen
const HelpScreen: FC = () => {
  const insets = useSafeAreaInsets();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // FAQ following Jakob's Law - familiar patterns from popular apps
  const FAQ_BY_CATEGORY = {
    'Getting Started': [
      {
        id: 'what-is-app',
        question: 'What is this app?',
        answer:
          'A free Arabic learning app. Read classical Islamic texts with translations and build vocabulary through spaced repetition.',
        category: 'Getting Started',
      },
      {
        id: 'is-free',
        question: 'Is this app free?',
        answer:
          'Yes, completely free with no ads or subscriptions. Created by Yûnus Andréasson (yunus@edenmind.com) for everyone.',
        category: 'Getting Started',
      },
      {
        id: 'who-is-this-for',
        question: 'Who is this app for?',
        answer:
          'Perfect for readers who can recognize Arabic letters and basic words but struggle with full texts. Add unknown words to your study list and memorize them.',
        category: 'Who is this app for?',
      },
      {
        id: 'how-to-start',
        question: 'How do I get started?',
        answer:
          'Go to Read tab, choose an article, tap any Arabic word to add it to your study list. Then use Practice tab to review with spaced repetition.',
        category: 'Getting Started',
      },
      {
        id: 'learning-speed',
        question: 'How quickly will I learn?',
        answer:
          'Most users see progress within days. The FSRS algorithm optimizes review timing - words you know well appear less often, difficult words more frequently.',
        category: 'Getting Started',
      },
    ],

    'Design Philosophy': [
      {
        id: 'why-simple',
        question: 'Why is the app so simple?',
        answer:
          'Minimalism puts content first. Removing distracting features is as important as adding new ones. Every element serves your Arabic learning.',
        category: 'Design Philosophy',
      },
      {
        id: 'what-makes-different',
        question: 'What makes this different?',
        answer:
          'Designed for the perfect experience reading classical Arabic texts, even without full fluency. Clean interface, authentic literature, smart learning.',
        category: 'Design Philosophy',
      },
    ],

    Features: [
      {
        id: 'spaced-repetition',
        question: 'How does spaced repetition work?',
        answer:
          'Uses the FSRS algorithm to show words just before you forget them. Good answers = longer intervals, difficult words = more frequent practice.',
        category: 'Features',
      },
      {
        id: 'memory-gauge',
        question: 'What is the Memory Gauge?',
        answer:
          'Shows your learning capacity in Practice tab. Green = ready for new words, Yellow = practice struggling words, Red = review due words first.',
        category: 'Features',
      },
      {
        id: 'word-highlighting',
        question: 'Why are some words highlighted together?',
        answer:
          'Arabic words can combine multiple English meanings. Color-coding shows prefixes, suffixes, and components to help you understand word structure.',
        category: 'Features',
      },
      {
        id: 'study-reminders',
        question: 'How do study reminders work?',
        answer:
          "Go to Account → toggle Study reminders on → tap Time to set your preferred reminder time. You'll get daily notifications to practice.",
        category: 'Features',
      },
    ],

    Content: [
      {
        id: 'why-classical-texts',
        question: 'Why classical texts?',
        answer:
          'Classical Arabic is the foundation. These texts teach proper grammar, vocabulary, and style while connecting you to Islamic literary heritage.',
        category: 'Content',
      },
      {
        id: 'theology-disclaimer',
        question: 'Is this for theology questions?',
        answer:
          'No, this is an Arabic language learning app. For detailed Islamic theology or jurisprudence, consult qualified scholars and traditional sources.',
        category: 'Content',
      },
      {
        id: 'article-recommendations',
        question: 'How are articles chosen for me?',
        answer:
          'Uses i+1 principle: 90-95% familiar words with just enough new vocabulary to challenge you. Perfect comprehensible input for natural learning.',
        category: 'Content',
      },
    ],

    Technical: [
      {
        id: 'audio-cache',
        question: 'What is audio cache?',
        answer:
          'Downloaded audio files stored on your device for offline playback. Go to Account → Audio cache → Clear to free up storage space.',
        category: 'Technical',
      },
      {
        id: 'clear-cache',
        question: 'How do I clear audio cache?',
        answer:
          'Account settings → Audio cache → Clear. Audio will re-download when needed. This frees up device storage space.',
        category: 'Technical',
      },
      {
        id: 'offline-mode',
        question: 'Does this work offline?',
        answer:
          'Partially. Downloaded articles and cached audio work offline. Adding new words or syncing progress requires internet connection.',
        category: 'Technical',
      },
    ],
  };

  const handleToggleItem = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={false}
        scrollable={true}
        style={styles.flexOne}
        useSafeArea={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: LAYOUT.SPACING.LARGE,
            paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
          removeClippedSubviews: false,
        }}
      >
        {Object.entries(FAQ_BY_CATEGORY).map(([category, items], categoryIndex) => (
          <View key={category} style={categoryIndex > 0 ? styles.categorySpacing : undefined}>
            <ThemedText
              type="heading2"
              weight="semibold"
              style={{ marginBottom: LAYOUT.SPACING.MEDIUM }}
            >
              {category}
            </ThemedText>
            <View style={styles.categoryContainer}>
              {items.map(item => (
                <FAQItemComponent
                  key={item.id}
                  isExpanded={expandedItems.has(item.id)}
                  item={item}
                  onToggle={handleToggleItem}
                />
              ))}
            </View>
          </View>
        ))}
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  scrollView: {
    flex: 1,
  },
  categoryContainer: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
  categorySpacing: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
});

export default HelpScreen;
