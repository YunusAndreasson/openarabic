import { memo } from 'react';

import { ChartBottomSheet } from './ChartBottomSheet';
import { MasteryChart } from './charts';
import { STRINGS } from '@/constants/strings';

interface WordsMasteredBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WordsMasteredBottomSheet = memo<WordsMasteredBottomSheetProps>(
  ({ isVisible, onClose }) => (
    <ChartBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.WORD_MASTERY}
      subtitle={STRINGS.WORD_MASTERY_SUBTITLE}
      ChartComponent={MasteryChart}
    />
  ),
);

WordsMasteredBottomSheet.displayName = 'WordsMasteredBottomSheet';
