import { memo } from 'react';

import { GenericBottomSheet } from '@/components/common/GenericBottomSheet';
import { LearnedChart } from '@/components/study/charts/LearnedChart';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

interface LearnedBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export const LearnedBottomSheet = memo<LearnedBottomSheetProps>(({ isVisible, onClose }) => {
  const { user } = useAuth();

  const { allWords: studyWords } = useFSRSQueries({
    userId: user?.id,
  });

  return (
    <GenericBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.LEARNED_WORDS}
      subtitle={STRINGS.LEARNED_WORDS_SUBTITLE}
    >
      <LearnedChart studyWords={studyWords ?? []} />
    </GenericBottomSheet>
  );
});

LearnedBottomSheet.displayName = 'LearnedBottomSheet';
