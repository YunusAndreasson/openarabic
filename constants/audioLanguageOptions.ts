/**
 * The options offered by the "Audio language" picker.
 *
 * Data, not a component — kept beside `themeOptions.ts`.
 */

import type { SettingsPickerOption } from '@/components/ui/SettingsPicker';
import { STRINGS } from '@/constants/strings';
import { AudioLanguage } from '@/types/enums';

export const AUDIO_LANGUAGE_OPTIONS: SettingsPickerOption<AudioLanguage>[] = [
  {
    id: AudioLanguage.ARABIC_ONLY,
    title: STRINGS.AUDIO_LANGUAGE_ARABIC,
    subtitle: STRINGS.AUDIO_LANGUAGE_ARABIC_SUBTITLE,
    icon: 'volume-high',
  },
  {
    id: AudioLanguage.ENGLISH_ARABIC,
    title: STRINGS.BILINGUAL_LABEL,
    subtitle: STRINGS.AUDIO_LANGUAGE_BILINGUAL_SUBTITLE,
    icon: 'language',
  },
];
