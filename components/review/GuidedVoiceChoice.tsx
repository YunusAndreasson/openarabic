import { useEffect, useState } from 'react';

import { ReviewActionButton } from './ReviewActionButton';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setVoiceEnabled } from '@/store/settingsSlice';
import { toLocalDateString } from '@/utils/dateTimeUtils';
import { readStudyDays } from '@/utils/studyDayLedger';

/** Optional action on an ordinary recall card after a previous local study day. */
export function GuidedVoiceChoice() {
  const eligible = useAppSelectorShallow(
    state =>
      state.firstPage.guided && !state.settings.voiceEnabled && !state.settings.voiceOfferDismissed,
  );
  const [laterDay, setLaterDay] = useState(false);
  const colors = useColors();
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!eligible) return;
    let mounted = true;
    void readStudyDays().then(days => {
      const today = toLocalDateString(new Date());
      if (mounted) setLaterDay([...days].some(day => day < today));
    });
    return () => {
      mounted = false;
    };
  }, [eligible]);
  if (!eligible || !laterDay) return null;
  return (
    <ReviewActionButton
      label={STRINGS.VOICE_SPEAK_TO_ANSWER}
      sublabel={STRINGS.VOICE_OPT_IN_DETAIL}
      color={colors.tint}
      onPress={() => {
        void analytics.track(ANALYTICS_EVENTS.VOICE_PRIMING_ACCEPTED, { source: 'review_card' });
        dispatch(setVoiceEnabled(true));
      }}
    />
  );
}
