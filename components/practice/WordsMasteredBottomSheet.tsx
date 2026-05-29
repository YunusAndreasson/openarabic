import { ChartBottomSheet } from './ChartBottomSheet';
import { MasteryChart } from './charts';
import { STRINGS } from '@/constants/strings';

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export function WordsMasteredBottomSheet({ isVisible, onClose }: Props) {
  return (
    <ChartBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.WORD_MASTERY}
      subtitle={STRINGS.WORD_MASTERY_SUBTITLE}
      ChartComponent={MasteryChart}
    />
  );
}
