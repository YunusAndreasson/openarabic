import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { getWordShareLink, sharePublicLink } from '@/utils/publicShare';

import { ListRow } from './ListRow';

export function ShareWordRow({ root }: Pick<StudyWord, 'root'>) {
  const colors = useColors();
  const link = getWordShareLink(root);
  if (!link) return null;

  return (
    <ListRow
      accessibilityLabel={STRINGS.SHARE_WORD}
      hapticType="selection"
      onPress={() => void sharePublicLink(link)}
    >
      <Icon
        name="share-outline"
        size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
        color={colors.secondaryText}
      />
      <ThemedText type="body">{STRINGS.SHARE_WORD}</ThemedText>
    </ListRow>
  );
}
