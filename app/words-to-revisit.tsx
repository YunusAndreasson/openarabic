import type { JSX } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BottomSheetHeader, BottomSheetStateHandler, SheetScreen } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { IconButton } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useResetWordProgress } from '@/hooks/vocabulary/useResetWordProgress';
import { useWordsToRevisit } from '@/hooks/vocabulary/useWordsToRevisit';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';

/** Content-area height as a fraction of the window — constant across states. */
const REVISIT_CONTENT_HEIGHT_FRACTION = 0.45;

function formatForgotCount(count: number): string {
  return STRINGS.FORGOT_N_TIMES.replace('{count}', String(count));
}

interface LeechRowProps {
  word: StudyWord;
  onReset: (rootId: RootId) => void;
}

function LeechRow({ word, onReset }: LeechRowProps): JSX.Element {
  const colors = useColors();
  const letters = word.root?.letters ?? '';
  const meaning = word.root?.meaning ?? '';
  const lapses = word.fsrs_lapses ?? 0;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.wordColumn}>
        <ThemedText type="arabic" numberOfLines={1}>
          {letters}
        </ThemedText>
        {meaning ? (
          <ThemedText type="caption" colorName="textTertiary" numberOfLines={1}>
            {meaning}
          </ThemedText>
        ) : null}
      </View>

      <View style={[styles.badge, { backgroundColor: colors.elevation2 }]}>
        <ThemedText type="caption" colorName="error">
          {formatForgotCount(lapses)}
        </ThemedText>
      </View>

      <IconButton
        icon="refresh"
        variant="danger"
        iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
        onPress={() => onReset(word.root_id)}
      />
    </View>
  );
}

export default function WordsToRevisitScreen(): JSX.Element {
  const { leeches, isLoading, isError } = useWordsToRevisit();
  const { confirmReset } = useResetWordProgress();
  const { height } = useWindowDimensions();

  return (
    <SheetScreen>
      <BottomSheetHeader
        title={STRINGS.WORDS_TO_REVISIT}
        subtitle={STRINGS.WORDS_TO_REVISIT_SUBTITLE}
      />
      {/* Fixed-height content area: a fitToContents form sheet measures its
          detent ONCE at presentation. When the leech list loads after the
          sheet presented (cold FSRS cache), iOS keeps the small loading-state
          height and the taller list renders overlapping the header. Locking
          the content area's height makes loading/empty/loaded measure
          identically, so the sheet is right-sized no matter which state it
          presents in. */}
      <View style={{ height: height * REVISIT_CONTENT_HEIGHT_FRACTION }}>
        <BottomSheetStateHandler
          isLoading={isLoading}
          isError={isError}
          isEmpty={leeches.length === 0}
          loadingMessage={STRINGS.LOADING_WORDS_TO_REVISIT}
          errorMessage={STRINGS.FAILED_TO_LOAD_WORDS_TO_REVISIT}
          emptyMessage={STRINGS.WORDS_TO_REVISIT_EMPTY_STATE}
        >
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {leeches.map(word => (
              <LeechRow key={word.root_id} word={word} onReset={confirmReset} />
            ))}
          </ScrollView>
        </BottomSheetStateHandler>
      </View>
    </SheetScreen>
  );
}

export const options = {
  headerShown: false,
} as const;

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wordColumn: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
  },
  badge: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
});
