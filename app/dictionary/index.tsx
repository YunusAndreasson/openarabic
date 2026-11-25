import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Keyboard, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, ListRow, LoadingState } from '@/components/common';
import { ThemedInput } from '@/components/primitives/ThemedInput';
import { ThemedText } from '@/components/primitives/ThemedText';
import { ThemedView } from '@/components/primitives/ThemedView';
import { DisclosureChevron } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { dictionaryQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useDictionarySearch } from '@/hooks/vocabulary/useDictionarySearch';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { getDictionaryWordRoute } from '@/utils/routeBuilders';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

const keyExtractor = (entry: Tables<'roots'>) => String(entry.id);

export default function DictionaryScreen() {
  const client = useQueryClient();
  const { query: initialQuery } = useLocalSearchParams<{ query?: string }>();
  const { input, setInput, term, isDebouncing } = useDictionarySearch(
    typeof initialQuery === 'string' ? initialQuery : '',
  );
  const query = useQuery(dictionaryQueries.search(term));

  function openEntry(entry: Tables<'roots'>) {
    const rootId = entry.id as RootId;
    client.setQueryData(dictionaryQueries.entry(rootId).queryKey, entry);
    Keyboard.dismiss();
    router.push(getDictionaryWordRoute(rootId));
  }

  let content;
  if (!term && !isDebouncing) {
    content = (
      <EmptyState
        icon="book-outline"
        title={STRINGS.PUBLIC_DICTIONARY_IDLE_TITLE}
        hint={STRINGS.PUBLIC_DICTIONARY_IDLE_HINT}
      />
    );
  } else if (isDebouncing || query.isLoading) {
    content = <LoadingState />;
  } else if (query.data === undefined) {
    content = (
      <ErrorState
        message={query.isPaused ? STRINGS.NO_INTERNET_CONNECTION : STRINGS.PUBLIC_DICTIONARY_ERROR}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (query.data.length === 0) {
    content = (
      <EmptyState
        icon="search-outline"
        title={STRINGS.PUBLIC_DICTIONARY_EMPTY_TITLE}
        hint={STRINGS.PUBLIC_DICTIONARY_EMPTY_HINT}
      />
    );
  } else {
    content = (
      <FlashList
        data={query.data}
        keyExtractor={keyExtractor}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.results}
        renderItem={({ item }) => (
          <ListRow divider onPress={() => openEntry(item)}>
            <View style={styles.word}>
              <ThemedText type="arabicCompact" align="left">
                {item.letters}
              </ThemedText>
              <ThemedText type="body" colorName="secondaryText">
                {capitalizeFirstLetter(item.meaning)}
              </ThemedText>
            </View>
            <DisclosureChevron />
          </ListRow>
        )}
      />
    );
  }

  return (
    <ThemedView safeAreaEdges={['left', 'right', 'bottom']} style={styles.screen}>
      <View style={styles.search}>
        <ThemedInput
          testID="public-dictionary-search"
          accessibilityLabel={STRINGS.PUBLIC_DICTIONARY_SEARCH}
          placeholder={STRINGS.PUBLIC_DICTIONARY_SEARCH}
          icon="search"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          value={input}
          onChangeText={setInput}
        />
      </View>
      <View style={styles.screen}>{content}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  results: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  word: { flex: 1, gap: LAYOUT.SPACING.TINY },
});
