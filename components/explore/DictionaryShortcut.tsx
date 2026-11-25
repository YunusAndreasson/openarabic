import { StyleSheet } from 'react-native';

import { ListRow } from '@/components/common/ListRow';
import { ThemedText } from '@/components/primitives/ThemedText';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { Icon } from '@/components/ui/Icon';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

export function DictionaryShortcut({ onPress }: { onPress: () => void }) {
  const colors = useColors();

  return (
    <ListRow divider onPress={onPress}>
      <Icon name="book-outline" color={colors.tint} size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM} />
      <ThemedText type="body" weight="semibold" style={styles.label}>
        {STRINGS.PUBLIC_DICTIONARY_TITLE}
      </ThemedText>
      <DisclosureChevron />
    </ListRow>
  );
}

const styles = StyleSheet.create({ label: { flex: 1 } });
