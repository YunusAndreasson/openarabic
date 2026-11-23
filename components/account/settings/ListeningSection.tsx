import { memo, useCallback } from 'react';

import { SettingsCard, SettingsSection } from '@/components/account';
import { STRINGS } from '@/constants/strings';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { selectAudioLanguage, setAudioShuffleEnabled } from '@/store/settingsSlice';
import { AudioLanguage } from '@/types/enums';

interface ListeningSectionProps {
  /** Open the audio language picker */
  onAudioLanguagePress: () => void;
  playbackSpeedLabel: string;
  onPlaybackSpeedPress: () => void;
}

/**
 * Listening settings — article audio and playlist playback.
 *
 * The section subtitle carries the scope for the rows, which is what lets
 * "Shuffle" stay one word instead of "Shuffle playlist articles".
 */
export const ListeningSection = memo<ListeningSectionProps>(
  ({ onAudioLanguagePress, playbackSpeedLabel, onPlaybackSpeedPress }) => {
    const dispatch = useAppDispatch();

    const currentAudioLanguage = useAppSelectorShallow(selectAudioLanguage);
    const audioShuffleEnabled = useAppSelectorShallow(state => state.settings.audioShuffleEnabled);

    const currentAudioLanguageText =
      currentAudioLanguage === AudioLanguage.ARABIC_ONLY
        ? STRINGS.AUDIO_LANGUAGE_ARABIC
        : STRINGS.BILINGUAL_LABEL;

    const handleAudioShuffleToggle = useCallback(
      (enabled: boolean) => {
        dispatch(setAudioShuffleEnabled(enabled));
      },
      [dispatch],
    );

    return (
      <SettingsSection
        title={STRINGS.LISTENING_SECTION}
        subtitle={STRINGS.LISTENING_SECTION_SUBTITLE}
      >
        <SettingsCard
          icon="volume-high"
          label={STRINGS.AUDIO_LANGUAGE}
          rightType="text-chevron"
          rightText={currentAudioLanguageText}
          onPress={onAudioLanguagePress}
        />
        <SettingsCard
          icon="speedometer"
          label={STRINGS.PLAYBACK_SPEED}
          rightType="text-chevron"
          rightText={playbackSpeedLabel}
          onPress={onPlaybackSpeedPress}
        />
        <SettingsCard
          icon="shuffle"
          label={STRINGS.AUDIO_SHUFFLE}
          rightType="toggle"
          toggleValue={audioShuffleEnabled}
          onToggleChange={handleAudioShuffleToggle}
        />
      </SettingsSection>
    );
  },
);

ListeningSection.displayName = 'ListeningSection';
