import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ArticleSentence } from '@/components/article/ArticleSentence';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { SentenceArticle, SentenceWithWords } from '@/services/sentences';
import type { RootId } from '@/types/branded.types';

interface WordExampleBlockProps {
  sentence: SentenceWithWords;
  /** The practised root, drawn with a thicker underline inside the line. */
  highlightRootId: RootId;
  /** Hairline above. Set on every block but the first. */
  showDivider: boolean;
  /**
   * Opens the source article. Omitted — or passed a sentence with no article —
   * and the block is inert, exactly as it was before attribution existed.
   */
  onOpenArticle?: (article: SentenceArticle, sentenceId: number) => void;
}

/**
 * One example of the word in real use, named and reachable.
 *
 * The section has always been headed "In articles" while naming no article and
 * going nowhere: `article_id` arrived with every sentence and was dropped on the
 * floor. Reading is where these words come from, so a word screen that cannot
 * send you back to the reading leaves the loop open in one direction.
 *
 * **The whole block is the control**, not a link tacked under it. The title, the
 * Arabic and the translation are one thing — an example — and giving it a sixth
 * row of chrome to carry a tap target would be the opposite of what this screen
 * was corrected into.
 *
 * Plain RN `Pressable` here, deliberately not gesture-handler's: that import
 * exists in `ArticleSentence` because the article screen wraps its body in an
 * RNGH background-tap catcher. This screen is an ordinary `ScrollView`.
 */
const WordExampleBlockComponent = ({
  sentence,
  highlightRootId,
  showDivider,
  onOpenArticle,
}: WordExampleBlockProps) => {
  const colors = useColors();
  const { article } = sentence;
  const canOpen = !!article && !!onOpenArticle;

  const body = (
    <>
      {article ? (
        <View style={styles.source}>
          <ThemedText
            type="caption"
            colorName="subtleLabelText"
            numberOfLines={1}
            style={styles.sourceTitle}
          >
            {article.title}
          </ThemedText>
          {canOpen ? (
            <Icon
              color={colors.textTertiary}
              name="chevron-forward"
              size={LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE}
            />
          ) : null}
        </View>
      ) : null}

      {/* `english` is deliberately blanked so ArticleSentence renders only the
          Arabic words. The reader leads with the translation; a screen about one
          Arabic word leads with the Arabic, and the translation follows as
          support below. */}
      <ArticleSentence
        sentence={{ id: sentence.id, english: '', arabic: sentence.arabic }}
        words={sentence.sentence_words}
        colors={colors}
        highlightRootId={highlightRootId}
        containerStyle={styles.sentenceContainer}
      />

      {sentence.english ? (
        <ThemedText type="caption" colorName="captionText" style={styles.sentenceEnglish}>
          {sentence.english}
        </ThemedText>
      ) : null}
    </>
  );

  const blockStyle = [
    styles.block,
    showDivider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  ];

  if (!canOpen) {
    return <View style={blockStyle}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={STRINGS.WORD_EXAMPLE_OPEN_A11Y.replace('{title}', article.title)}
      accessibilityRole="link"
      android_ripple={{ color: colors.navigationRipple, borderless: false }}
      style={blockStyle}
      onPress={() => onOpenArticle(article, sentence.id)}
    >
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  block: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    // ArticleSentence insets its own words by MEDIUM; match it so the title
    // starts on the same column as the Arabic below it.
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  sourceTitle: {
    flexShrink: 1,
  },
  sentenceContainer: {
    marginVertical: 0,
  },
  sentenceEnglish: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
});

export const WordExampleBlock = memo(WordExampleBlockComponent);

WordExampleBlock.displayName = 'WordExampleBlock';
