import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

import { SearchResultList } from '@/components/explore';
import { ThemedView } from '@/components/primitives/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useArticleSearch } from '@/hooks/articles/useArticleSearch';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';

/**
 * Searching the texts.
 *
 * A screen of its own rather than a search bar on Explore: `Stack.SearchBar`'s
 * options are composed over the screen's own and replace
 * `headerSearchBarOptions` wholesale, and Explore's iOS large-title collapse
 * depends on a three-part arrangement documented on `createTabHeaderOptions`
 * that a search controller in the same navigation bar would be the fourth
 * variable in. Here there is no large title to lose.
 *
 * The results list is the screen's only child below the search bar, and that is
 * deliberate — see the note on `SearchResultList`.
 */
export default function SearchScreen(): JSX.Element {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const searchBarRef = useRef<SearchBarCommands>(null);

  const { results, hasQuery, isBodyLoading, isBodyError, retryBody } = useArticleSearch(query);

  // `autoFocus` below is Android-only, so iOS is focused by hand. Someone who
  // tapped a magnifier is here to type; making them tap the field as well is a
  // step the platform does not ask for anywhere else.
  useEffect(() => {
    if (Platform.OS === 'ios') {
      searchBarRef.current?.focus();
    }
  }, []);

  /**
   * Blur before leaving, or the search field takes a scrim with it.
   *
   * The root stack freezes a blurred screen. If the native search field still
   * holds focus when this one freezes, the Android SearchView leaves a ~12%
   * white overlay across the content, and it is still there when the learner
   * comes back from the reader — the app's #040D07 background reads as #232A25.
   * The keyboard hides it on the way out, so it only becomes visible once the
   * keyboard goes down, which makes it look like a keyboard bug rather than a
   * navigation one. Verified on device: removing the search bar removes the
   * scrim, and blurring first prevents it.
   */
  const handleArticlePress = useCallback((article: Article) => {
    searchBarRef.current?.blur();
    router.push(getArticleRoute(article.id, article.title));
  }, []);

  return (
    <ThemedView style={styles.container}>
      {/* Native header search bar (UISearchController on iOS, SearchView on
          Android). Declarative in SDK 57 — it renders null and folds its props
          into this screen's header options. */}
      <Stack.SearchBar
        ref={searchBarRef}
        autoFocus
        placeholder={STRINGS.SEARCH_TEXTS_PLACEHOLDER}
        hideWhenScrolling={false}
        autoCapitalize="none"
        onChangeText={event => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        onClose={() => setQuery('')}
        // Android SearchView colors (iOS adapts to the theme on its own)
        headerIconColor={colors.text}
        textColor={colors.text}
        hintTextColor={colors.textTertiary}
      />
      <SearchResultList
        results={results}
        hasQuery={hasQuery}
        isBodyLoading={isBodyLoading}
        isBodyError={isBodyError}
        onRetryBody={retryBody}
        onArticlePress={handleArticlePress}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
});
