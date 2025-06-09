import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

type InfoModalType = 'efficiency' | 'mastery' | 'progress' | 'recommendation' | 'retrievability';

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
    title: 'Next Steps',
    subtitle: 'Your personalized study guidance based on memory science and cognitive load.',
    sections: [
      {
        title: 'Review First',
        content:
          'This appears when you have 15+ overdue words or more than 25% of your vocabulary needs review.\n\nYour brain can only process limited new information when working memory is occupied with overdue reviews. Think of it like trying to learn new dance moves while still struggling with basic steps – it creates cognitive overload and reduces how well you remember everything.\n\nWhen you have too many overdue words, adding new vocabulary actually hurts your learning. Your mental workspace gets cluttered, and both old and new words suffer. This is why the system recommends focusing on reviews first.\n\nComplete all overdue reviews before adding new words. This clears your mental workspace and maximizes your capacity for learning new vocabulary effectively.',
        icon: 'stop-circle',
      },
      {
        title: 'Review Then Add',
        content:
          'This appears when you have 5-15 due words with moderate review load.\n\nYou have some review burden, but your brain can still handle new information. The key is smart sequencing – reviews first, then new words. This prevents cognitive overload while allowing controlled growth.\n\nWhen you review first, you refresh existing memories and clear mental space. Then when you encounter new words, your brain has full capacity to encode them properly. This sequencing dramatically improves retention rates.\n\nPause new word addition temporarily. Complete your due reviews first, then add a few new words. This maintains strong retention of what you know while allowing steady vocabulary expansion.',
        icon: 'pause-circle',
      },
      {
        title: 'Add New Words',
        content:
          'This appears when you have minimal review load and optimal conditions.\n\nYour brain has maximum capacity for new learning right now. With few overdue reviews, your working memory is clear and ready to encode new vocabulary effectively. This is the perfect time to expand without compromising what you already know.\n\nResearch shows that learning is most effective when you have this kind of mental clarity. New words get stronger initial encoding, and you can connect them to existing knowledge more easily.\n\nGo ahead and add new words confidently. Your memory system is primed for growth. Focus on quality over quantity – a few well-learned words beat many poorly remembered ones.',
        icon: 'play-circle',
      },
    ],
    tips: [
      'Following these recommendations can improve retention by 2-3x',
      'Add 3-5 new words when optimal, focus on consistency over volume',
      'Review when mentally fresh for maximum effectiveness',
      'Trust the system – it adapts to your individual patterns',
    ],
  },
  mastery: {
    title: 'Word Mastery',
    subtitle: 'Track how vocabulary moves from new learning to permanent knowledge.',
    sections: [
      {
        title: 'Memory Strength Science',
        content:
          "This graph reveals how memories transform from fragile new connections into permanent knowledge. Based on decades of cognitive science research, it shows your vocabulary developing through predictable stages.\n\nWhen you first encounter a word, your brain creates a weak memory trace. This initial memory is fragile – without reinforcement, it fades within hours or days. But each time you successfully recall that word, you strengthen the neural pathway. The memory becomes more durable and resistant to forgetting.\n\nThis process follows comprehensible input theory. New words that appear in contexts you mostly understand get encoded most effectively. Your brain can focus on that new word because everything else makes sense.\n\nThe percentage shown represents memory stability across your entire vocabulary. Higher percentages mean more words have moved from temporary storage into long-term memory. This isn't just memorization – it's genuine language acquisition where words become part of your natural thinking.",
        icon: 'school',
      },
      {
        title: 'Your Progress Pattern',
        content:
          "The line chart shows your memory strength journey over the past week. Steep upward climbs indicate breakthrough sessions where you successfully strengthened multiple words simultaneously. These peaks often happen when you practice in an optimal mental state with good focus.\n\nDon't worry about plateaus – they're completely normal and scientifically expected. Your brain needs time to consolidate memories between growth phases. Sometimes it's quietly organizing knowledge in the background, making connections between words you've learned.\n\nConsistent daily engagement matters more than dramatic single-day gains. Small, regular practice sessions create more durable memories than intensive cramming. This aligns with the spacing effect – one of the most robust findings in memory research.\n\nWhen the line rises steadily, you're building genuine language competence. These aren't just memorized definitions sitting in isolation. They're becoming part of your active vocabulary network, connected to concepts you already know and ready for natural use.",
        icon: 'trending-up',
      },
      {
        title: 'Strong Words: Your Foundation',
        content:
          "Strong words represent vocabulary that has reached long-term memory stability. These words require minimal review and are ready for spontaneous use in reading, listening, conversation, and writing.\n\nEvery strong word is a genuine achievement. Unlike temporarily memorized vocabulary that disappears when cramming ends, these words have become part of your permanent language ability. They represent the foundation you can confidently build upon.\n\nStrong words demonstrate that comprehensible input works. They were acquired through meaningful encounters in context, not through isolated drilling. Each one proves that your brain's natural language acquisition system is functioning properly.\n\nClick the strong word count to see which specific words have reached this stable state. You might be surprised by how much genuine vocabulary you've developed. These words are your guarantee that the time invested in practice has created lasting language ability.",
        icon: 'checkmark-circle',
      },
    ],
    tips: [
      'Steep climbs show breakthrough learning – celebrate these moments',
      'Plateaus are natural consolidation periods – stay consistent',
      'Focus on understanding words in context, not isolated memorization',
      'Strong words are permanent additions to your language ability',
    ],
  },
  retrievability: {
    title: 'Review Timing',
    subtitle: 'Understand memory decay patterns and discover optimal timing for maximum retention.',
    sections: [
      {
        title: 'The Forgetting Curve',
        content:
          "All human memories naturally fade without reinforcement – this fundamental principle is called the forgetting curve, discovered by Hermann Ebbinghaus over a century ago. Understanding this curve is key to efficient language learning.\n\nFresh memories decay rapidly at first. Without review, you might lose 50-80% of new information within the first day. However, each successful recall dramatically changes this pattern. The memory becomes more stable and resists forgetting for increasingly longer periods.\n\nThis chart predicts how much of your vocabulary you're likely to remember right now, based on the strength each word has achieved and when you last reviewed it. It's not testing you – it's forecasting optimal study timing.\n\nThe genius of spaced repetition is reviewing just before you would forget. This timing creates the strongest possible memory reinforcement while minimizing wasted effort on words you already remember well.\n\nYour retention percentage reflects years of memory research applied to your individual patterns. The system learns how your unique brain processes and retains information, becoming more accurate over time.",
        icon: 'time',
      },
      {
        title: 'Catching Words Before They Fade',
        content:
          "Words approaching the forgetting threshold appear as priority items in your practice queue. These warnings represent your most efficient opportunities – catching memories just before they fade requires far less effort than relearning forgotten vocabulary from scratch.\n\nWhen memories start to weaken, the neural pathways become harder to access but aren't completely lost. A well-timed review reactivates these pathways and extends the retention period exponentially. Miss this window, and you may need to rebuild the entire memory.\n\nThis aligns with input hypothesis: you need comprehensible input at the right moment. Words reviewed too early (when still fresh) provide no benefit. Words reviewed too late (after forgetting) require starting over. The optimal moment is when the memory is just starting to fade.\n\nPrioritizing fading words in your practice sessions prevents memory loss and builds increasingly stable long-term retention. Each successful rescue makes that word stronger and extends its next review interval.",
        icon: 'warning-outline',
      },
      {
        title: 'Your Personal Retention Forecast',
        content:
          "The retention percentage shows predicted vocabulary recall based on memory science and your individual history. Higher percentages indicate stable retention across your entire vocabulary – a sign that your study system is working effectively.\n\nThis forecast helps you make smart decisions about study focus. When retention is high (above 85-90%), you can confidently add new words. Your existing vocabulary is stable, so your brain has capacity for new learning. When retention drops below 80%, prioritize reviews to strengthen existing memories.\n\nThe prediction becomes more accurate as the system learns your personal forgetting patterns. Some people retain visual vocabulary longer, others remember words learned through audio better. Some forget quickly but relearn fast, while others have slow but steady decay.\n\nThis personalization is crucial because one-size-fits-all study schedules don't work. Your brain has unique characteristics, and optimal learning requires adapting to your individual memory patterns rather than following generic timing.",
        icon: 'shield',
      },
    ],
    tips: [
      'Review just before forgetting for strongest memory formation',
      'Green zones (85%+) indicate good time for adding new words',
      'Yellow/red zones need immediate review to prevent memory loss',
      'Consistent practice prevents steep drops in retention',
    ],
  },
  efficiency: {
    title: 'Learning Speed',
    subtitle:
      'Measure learning velocity and discover how to optimize your vocabulary acquisition rate.',
    sections: [
      {
        title: 'Understanding Learning Velocity',
        content:
          "This graph measures how quickly you transform new words into strong, permanent vocabulary. Learning velocity reflects whether you're hitting the optimal challenge level – that sweet spot where material is neither too easy nor overwhelming.\n\nEfficient learning happens when words exist at your \"i+1\" level, as described in Stephen Krashen's groundbreaking input hypothesis. This means vocabulary that's just one step beyond what you currently know, but still comprehensible through context.\n\nWhen velocity increases, you're finding this optimal zone where your brain can process and encode new information most effectively. The material challenges you without creating cognitive overload, allowing smooth absorption of new patterns.\n\nSlow velocity often indicates the material is either too easy (no challenge, no growth) or too hard (cognitive overload prevents effective encoding). The system helps you find that perfect middle ground where acquisition happens naturally.\n\nThis aligns with theory that we acquire language by understanding messages containing structures slightly beyond our current competence. When you hit this zone consistently, learning accelerates dramatically.",
        icon: 'speedometer',
      },
      {
        title: 'Factors That Optimize Speed',
        content:
          "Multiple cognitive factors influence how quickly you master new vocabulary. Understanding these variables helps you create optimal conditions and maximize your study efficiency.\n\nWord difficulty relative to your current level matters most. Research shows that vocabulary at exactly the right challenge level (i+1) gets acquired most readily. Words that are too familiar provide no growth stimulus, while words that are too advanced create confusion and frustration.\n\nYour mental state during practice dramatically impacts velocity. Studying when mentally fresh, with good focus and low stress, improves how effectively new memories form. This relates to affective filter hypothesis – anxiety and stress literally block language acquisition.\n\nThe spacing between review sessions also affects efficiency. Reviews that are too frequent waste time on words you haven't forgotten yet. Reviews that are too infrequent allow forgetting, requiring more total practice time. The system calculates optimal intervals automatically.\n\nContextual understanding accelerates learning. Words encountered in meaningful contexts (stories, conversations, real situations) get stronger initial encoding than isolated vocabulary lists. Your brain naturally connects new words to existing knowledge networks.",
        icon: 'settings',
      },
      {
        title: 'Strategies for Maximum Efficiency',
        content:
          'To optimize your velocity, focus on creating ideal conditions for memory formation. Quality attention during review creates stronger, more durable memories than distracted practice sessions.\n\nConnect new words to concepts you already understand. Your brain builds networks of related ideas, so linking new vocabulary to existing knowledge makes it stick better and become more accessible during natural use. This network building is how true fluency develops.\n\nTrust the spaced repetition timing system. It schedules reviews at scientifically optimal intervals based on your individual memory patterns. Fighting the system by reviewing too early or too late reduces overall efficiency.\n\nStudy when your mind is fresh and alert. Memory consolidation requires metabolic energy, so practicing when tired or distracted creates weaker memory traces. Even 10 minutes of focused study beats 30 minutes of half-hearted review.\n\nEmbrace the comprehensible input principle: seek out vocabulary in contexts you mostly understand. Whether through reading, listening, or conversation, words learned in meaningful situations develop stronger, more flexible memories than isolated study.',
        icon: 'bulb',
      },
    ],
    tips: [
      'Study when mentally fresh for better memory encoding',
      'Connect new words to existing knowledge for stronger networks',
      'Focus on understanding context, not just memorizing definitions',
      'Consistent daily practice beats intensive cramming sessions',
    ],
  },
  progress: {
    title: 'Progress Stages',
    subtitle: 'Understand how words move through your memory system and what each stage means.',
    sections: [
      {
        title: 'Due Words: Optimal Opportunities',
        content:
          "Due words represent your highest-impact practice opportunities. These words have reached their scientifically optimal review timing based on spaced repetition research – they're at the perfect moment for memory strengthening.\n\nThe timing isn't arbitrary. Each word's review schedule adapts to your individual forgetting pattern for that specific vocabulary item. Some words you remember longer, others fade faster. The system learns these personal patterns and schedules accordingly.\n\nWhen you review words at this optimal timing, you create the strongest possible memory reinforcement. Each successful recall extends how long you'll remember and builds more durable vocabulary knowledge. This is the core principle behind spaced repetition's effectiveness.\n\nPrioritizing due words over new words maximizes efficiency. Adding new vocabulary when you have overdue reviews creates cognitive interference – your brain struggles to process new information while existing memories are unstable.\n\nThis reflects emphasis on comprehensible input. When your existing vocabulary is well-maintained, new words appear in contexts you can understand, enabling natural acquisition.",
        icon: 'alarm-outline',
      },
      {
        title: 'Learning Words: Building Strength',
        content:
          "Learning words represent vocabulary in the critical memory formation stage. With each successful review, they move closer to long-term stability. This is where most of your active language development happens.\n\nThese words are developing from initial weak memory traces into stable knowledge. The process isn't linear – some reviews will feel easy, others challenging, as your brain consolidates the information through different memory pathways.\n\nConsistent practice with learning words is crucial. Skipping reviews can send them backward in the memory strength sequence, requiring more total practice time to reach stability. Regular engagement maintains forward momentum.\n\nThis stage demonstrates acquisition process in action. Words are moving from conscious effort to automatic recognition. Eventually, they'll require minimal attention and become available for natural, spontaneous use.\n\nMaintain steady practice with these words. They're on the path to becoming permanent vocabulary that you can use naturally and confidently in real communication situations.",
        icon: 'school-outline',
      },
      {
        title: 'Strong Words: Permanent Assets',
        content:
          "Strong words represent the ultimate goal: vocabulary that has reached memory stability and become part of your permanent language ability. These words require minimal review and are ready for natural use in any context.\n\nEvery strong word is genuine language acquisition, not temporary memorization. They represent vocabulary you truly own rather than words you've crammed for a test. This distinction is crucial – strong words become part of your thinking process.\n\nStrong words enable natural language use. They're available automatically during reading, listening, speaking, and writing. You don't need to consciously recall them – they emerge naturally when needed, just like words in your native language.\n\nThis achievement validates acquisition theory. These words were learned through comprehensible input and meaningful practice, not through drilling isolated vocabulary lists. They demonstrate that natural language acquisition processes work effectively.\n\nCelebrate this count as your measure of real progress. Each strong word is a building block for more advanced learning and natural communication ability.",
        icon: 'checkmark-circle-outline',
      },
    ],
    tips: [
      'Due words offer your highest-impact practice opportunities',
      'Learning words need consistent practice to keep progressing',
      'Strong words represent genuine vocabulary ownership',
      'Focus on moving words through stages rather than adding quantity',
    ],
  },
};

export default function InfoModalScreen(): JSX.Element {
  const { type } = useLocalSearchParams<{ type: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const content =
    type && INFO_CONTENT[type as InfoModalType] ? INFO_CONTENT[type as InfoModalType] : null;

  if (!content) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="body">Content not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE },
        ]}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {/* Content Title */}
        <View style={styles.titleContainer}>
          <ThemedText style={styles.contentTitle} type="heading2" weight="bold">
            {content.title}
          </ThemedText>
        </View>

        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <ThemedText style={styles.subtitle} type="body" variant="secondary">
            {content.subtitle}
          </ThemedText>
        </View>

        {/* Sections */}
        {content.sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              {section.icon && (
                <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name={section.icon} size={24} color={colors.tint} />
                </View>
              )}
              <ThemedText style={styles.sectionTitle} type="heading3" weight="bold">
                {section.title}
              </ThemedText>
            </View>
            <ThemedText style={styles.sectionContent} type="body">
              {section.content}
            </ThemedText>
            {index < content.sections.length - 1 && (
              <View style={[styles.sectionDivider, { backgroundColor: colors.borderOverlay }]} />
            )}
          </View>
        ))}

        {/* Tips Section */}
        {content.tips.length > 0 && (
          <View style={[styles.tipsContainer, { borderTopColor: colors.borderOverlay }]}>
            <ThemedText style={styles.tipsTitle} type="heading3" weight="bold">
              Key Insights
            </ThemedText>
            {content.tips.map(tip => (
              <View key={tip} style={styles.tipItem}>
                <View style={[styles.tipBullet, { backgroundColor: colors.tint }]} />
                <ThemedText style={styles.tipText} type="body">
                  {tip}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  contentTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE + LAYOUT.SPACING.TINY / 2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE + LAYOUT.SPACING.TINY / 2,
  },
  subtitleContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  subtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE + LAYOUT.SPACING.TINY / 2,
  },
  section: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  iconContainer: {
    width: MIN_TOUCH_TARGET.SIZE - LAYOUT.SPACING.SMALL,
    height: MIN_TOUCH_TARGET.SIZE - LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  sectionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + LAYOUT.SPACING.TINY / 2,
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
  },
  sectionContent: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE + LAYOUT.SPACING.TINY,
    letterSpacing: 0.1,
  },
  sectionDivider: {
    height: LAYOUT.BORDER.WIDTH.NORMAL,
    marginTop: LAYOUT.SPACING.MEDIUM,
    opacity: LAYOUT.OPACITY.SUBTLE - 0.1,
  },
  tipsContainer: {
    borderTopWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    paddingTop: LAYOUT.SPACING.XLARGE,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  tipsTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + LAYOUT.SPACING.TINY / 2,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  tipBullet: {
    width: LAYOUT.SPACING.SMALL,
    height: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.SPACING.TINY,
    marginTop: LAYOUT.SPACING.SMALL,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  tipText: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE + LAYOUT.SPACING.TINY / 2,
  },
});
