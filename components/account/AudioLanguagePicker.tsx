import { memo, type FC } from 'react';

import { SettingsPicker, type SettingsPickerOption } from '@/components/ui/SettingsPicker';
import { STRINGS } from '@/constants/strings';
import type { AudioLanguagePreference } from '@/store/settingsSlice';
import { setAudioLanguagePreference } from '@/store/settingsSlice';
import { AudioLanguage } from '@/types/enums';

type AudioLanguageOption = SettingsPickerOption<AudioLanguagePreference>;

export const AUDIO_LANGUAGE_OPTIONS: AudioLanguageOption[] = [
  {
    id: AudioLanguage.ARABIC_ONLY,
    title: STRINGS.AUDIO_LANGUAGE_ARABIC,
    subtitle: 'Audio plays in Arabic with English subtitles',
    icon: 'volume-high',
  },
  {
    id: AudioLanguage.ENGLISH_ARABIC,
    title: STRINGS.AUDIO_LANGUAGE_BILINGUAL,
    subtitle: 'Audio plays in both Arabic and English',
    icon: 'language',
  },
];

export interface AudioLanguagePickerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AudioLanguagePicker: FC<AudioLanguagePickerProps> = memo(({ isVisible, onClose }) => {
  return (
    <SettingsPicker
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.AUDIO_LANGUAGE}
      options={AUDIO_LANGUAGE_OPTIONS}
      currentValueSelector={state => state.settings.audioLanguagePreference}
      onValueChange={setAudioLanguagePreference}
      snapPoints={[320]}
    />
  );
});

AudioLanguagePicker.displayName = 'AudioLanguagePicker';
