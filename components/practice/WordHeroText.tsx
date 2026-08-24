import type { FC } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { IconButton } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

interface WordHeroTextProps {
  arabicText: string;
  englishText: string;
  /** From `getArabicHeroTextStyle` — sized off the reading-size setting. */
  arabicStyle: TextStyle;
  /**
   * Read off `RootEnrichment`. Both callers show it, so height is always
   * reserved for this line — `enrichment?.headwordTransliteration` is
   * `undefined` both while the enrichment query is still loading and when a
   * root simply has no record, and those need the SAME reserve, not a way to
   * opt out of one.
   */
  transliteration: string | null | undefined;
  /**
   * From the sentence corpus, practice-screen only — the sheet never fetches
   * sentences, so it never passes this. Height-reserved the same way.
   */
  partOfSpeech?: string | null;
  audioUrl?: string | null;
  onPlayAudio: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The word every word screen leads with: the lemma, how to say it, what it
 * means, and the button that says it aloud.
 *
 * Shared because the practice word screen and the root-level word sheet
 * reported the same four things from two copies of the same JSX, including a
 * height-reserved transliteration line one of them was missing outright — the
 * exact class of drift `WordFsrsStats` already exists to prevent for the stat
 * rows below this.
 */
export const WordHeroText: FC<WordHeroTextProps> = ({
  arabicText,
  englishText,
  arabicStyle,
  transliteration,
  partOfSpeech,
  audioUrl,
  onPlayAudio,
  style,
}) => {
  const colors = useColors();

  return (
    <View style={[styles.hero, style]}>
      <View style={styles.heroText}>
        {partOfSpeech !== undefined ? (
          <View style={styles.heroMeta}>
            {partOfSpeech ? (
              <ThemedText colorName="tint" type="overline">
                {partOfSpeech}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        <ThemedText align="left" numberOfLines={1} style={arabicStyle} type="arabic">
          {arabicText}
        </ThemedText>

        <View style={styles.heroReading}>
          {transliteration ? (
            <ThemedText colorName="textTertiary" type="body">
              {transliteration}
            </ThemedText>
          ) : null}
        </View>

        <ThemedText colorName="secondaryText" type="body">
          {englishText}
        </ThemedText>
      </View>

      {audioUrl ? (
        <IconButton
          accessibilityLabel={STRINGS.PLAY_AUDIO}
          backgroundColor={colors.elevation2}
          hapticType="light"
          icon="volume-high"
          iconColor={colors.text}
          onPress={onPlayAudio}
        />
      ) : null}
    </View>
  );
};

WordHeroText.displayName = 'WordHeroText';

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  heroText: {
    flex: 1,
  },
  // Reserves the band whether or not the part of speech arrives, so a class
  // landing a beat after the word cannot drop the hero mid-read — see the
  // note on `heroReading`, same reasoning.
  //
  // `minHeight`, not `height`: `overline` is 13pt at a 1.4 line height and
  // nothing in this app disables font scaling, so a fixed ceiling clips the
  // label once the OS text scale passes ~1.3. Growing is the correct failure.
  heroMeta: {
    minHeight: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
  },
  // Reserves the transliteration line whether or not the enrichment record
  // has arrived yet — it comes from a separate query than the word itself, so
  // without the reserve it lands a beat later and pushes the gloss (and,
  // on the full screen, everything below it) down mid-read.
  heroReading: {
    minHeight: LAYOUT.SPACING.LARGE,
    justifyContent: 'center',
  },
});
