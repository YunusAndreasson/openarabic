import { memo, type FC } from 'react';

import { SettingsPicker, type SettingsPickerOption } from '@/components/ui/SettingsPicker';
import { STRINGS } from '@/constants/strings';
import type { DisplayLanguagePreference } from '@/store/settingsSlice';
import { setDisplayLanguagePreference } from '@/store/settingsSlice';
import { DisplayLanguage } from '@/types/enums';

type LanguageOption = SettingsPickerOption<DisplayLanguagePreference>;

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: DisplayLanguage.ARABIC_ONLY,
    title: STRINGS.DISPLAY_LANGUAGE_ARABIC,
    subtitle: 'Text displays in Arabic script with English translations',
    icon: 'text',
  },
  {
    id: DisplayLanguage.ARABIC_ENGLISH,
    title: STRINGS.DISPLAY_LANGUAGE_BILINGUAL,
    subtitle: 'Text shows both Arabic and English side by side',
    icon: 'language',
  },
];

export interface LanguagePickerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const LanguagePicker: FC<LanguagePickerProps> = memo(({ isVisible, onClose }) => {
  return (
    <SettingsPicker
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.DISPLAY_LANGUAGE}
      options={LANGUAGE_OPTIONS}
      currentValueSelector={state => state.settings.displayLanguagePreference}
      onValueChange={setDisplayLanguagePreference}
      snapPoints={[320]}
    />
  );
});

LanguagePicker.displayName = 'LanguagePicker';
