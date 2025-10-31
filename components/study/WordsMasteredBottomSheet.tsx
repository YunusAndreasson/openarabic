import { memo } from 'react';

import { GenericBottomSheet } from '@/components/common/GenericBottomSheet';
import { MasteryChart } from '@/components/study/charts/MasteryChart';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

interface WordsMasteredBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WordsMasteredBottomSheet = memo<WordsMasteredBottomSheetProps>(
  ({ isVisible, onClose }) => {
    const { user } = useAuth();

    const { allWords: studyWords } = useFSRSQueries({
      userId: user?.id,
    });

    return (
      <GenericBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        title={STRINGS.WORD_MASTERY}
        subtitle={STRINGS.WORD_MASTERY_SUBTITLE}
      >
        <MasteryChart studyWords={studyWords ?? []} />
      </GenericBottomSheet>
    );
  },
);

WordsMasteredBottomSheet.displayName = 'WordsMasteredBottomSheet';
