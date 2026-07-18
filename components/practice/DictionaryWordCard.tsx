import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ThemedText } from '@/components/ThemedText';
import { BaseCard } from '@/components/common';
import { ColorDot } from '@/components/ui/ColorDot';
import { Ionicons } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { getStabilityProgressColor } from '@/utils/urgencyScore';

const CHEVRON_SIZE = 14;

interface DictionaryWordCardProps {
  word: StudyWord;
  /** Opens the word detail sheet */
  onPress: (word: StudyWord) => void;
  /** Swipe action: remove the word from practice */
  onRemove: (word: StudyWord) => void;
  /** Swipe action: reset the word's FSRS progress */
  onResetProgress: (word: StudyWord) => void;
}

export const DictionaryWordCard = memo<DictionaryWordCardProps>(
  ({ word, onPress, onRemove, onResetProgress }) => {
    const colors = useColors();
    const swipeableRef = useRef<SwipeableMethods>(null);

    // FlashList recycles row instances onto new words — snap any open action
    // panel shut instantly so it can't carry over to the recycled row.
    useEffect(() => {
      swipeableRef.current?.reset();
    }, [word.root_id]);

    const handlePress = useCallback(() => {
      onPress(word);
    }, [onPress, word]);

    const handleRemove = useCallback(() => {
      swipeableRef.current?.close();
      onRemove(word);
    }, [onRemove, word]);

    const handleResetProgress = useCallback(() => {
      swipeableRef.current?.close();
      onResetProgress(word);
    }, [onResetProgress, word]);

    const renderRightActions = useCallback(
      () => (
        <View style={styles.actions}>
          <IconButton
            icon="refresh"
            onPress={handleResetProgress}
            backgroundColor={colors.warning}
            iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          />
          <IconButton
            icon="trash"
            onPress={handleRemove}
            variant="danger"
            iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          />
        </View>
      ),
      [handleResetProgress, handleRemove, colors.warning],
    );

    const arabicText = word.root?.letters ?? '';
    const englishText = useMemo(
      () => capitalizeFirstLetter(word.root?.meaning ?? ''),
      [word.root?.meaning],
    );
    const dotColorKey = useMemo(
      () => getStabilityProgressColor(word.fsrs_stability),
      [word.fsrs_stability],
    );

    return (
      <ReanimatedSwipeable
        ref={swipeableRef}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={renderRightActions}
        containerStyle={styles.container}
      >
        <BaseCard onPress={handlePress} shadowSize="small">
          <View style={styles.row}>
            <View style={styles.wordColumn}>
              <ThemedText type="arabic" weight="semibold" align="left" numberOfLines={1}>
                {arabicText}
              </ThemedText>
              <ThemedText type="caption" colorName="secondaryText" numberOfLines={1}>
                {englishText}
              </ThemedText>
            </View>

            <View style={styles.trailing}>
              <ColorDot color={colors[dotColorKey]} />
              <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.textTertiary} />
            </View>
          </View>
        </BaseCard>
      </ReanimatedSwipeable>
    );
  },
  (prevProps, nextProps) => {
    // Only compare values actually used in render output — the screen passes
    // stable callback references
    return (
      prevProps.word.root_id === nextProps.word.root_id &&
      prevProps.word.fsrs_stability === nextProps.word.fsrs_stability &&
      prevProps.word.root?.letters === nextProps.word.root?.letters &&
      prevProps.word.root?.meaning === nextProps.word.root?.meaning
    );
  },
);

DictionaryWordCard.displayName = 'DictionaryWordCard';

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.SMALL,
    // Swipeable defaults to overflow hidden, which clips the card's iOS shadow
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  wordColumn: {
    flex: 1,
    gap: LAYOUT.SPACING.HALF_TINY,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingLeft: LAYOUT.SPACING.MEDIUM,
  },
});
