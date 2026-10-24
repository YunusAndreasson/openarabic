import { router, useNavigation } from 'expo-router';
import type { NativeStackNavigationProp } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

import { SearchResultList } from '@/components/explore';
import { ThemedView } from '@/components/primitives/ThemedView';
import { HeaderSearchBar } from '@/components/ui/HeaderSearchBar';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticleSearch } from '@/hooks/articles/useArticleSearch';
import type { Article } from '@/types/articles.types';
import { getArticleRoute } from '@/utils/routeBuilders';

/**
 * Typed so `transitionEnd` is visible: it is a native-stack event, and the bare
 * `useNavigation()` return only carries the core ones. A type alias rather than
 * an interface, for the same generic-constraint reason `FilterParams` is one.
 */
type SearchScreenNavigation = NativeStackNavigationProp<Record<string, object | undefined>>;

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
  const navigation = useNavigation<SearchScreenNavigation>();
  const [query, setQuery] = useState('');
  const searchBarRef = useRef<SearchBarCommands>(null);

  const { results, hasQuery, isBodyLoading, isBodyError, retryBody } = useArticleSearch(query);

  /**
   * iOS focuses by hand, and not until the push has finished.
   *
   * `autoFocus` is Android-only. On iOS the field is a UISearchController the
   * header builds as the screen appears, so focusing at mount does nothing
   * twice over: the native view does not exist yet (react-native-screens warns
   * that its ref "has not been updated yet"), and UIKit swallows a focus issued
   * during a push anyway. That is why the field opened unfocused and wanted a
   * second tap.
   *
   * `transitionEnd` is the frame the screen has finished arriving on, and both
   * problems are gone by then. It is the same event this app already leans on
   * for the opening direction — see the `screenListeners` note in
   * `app/_layout.tsx`, which records that `closing: false` does fire.
   *
   * Once only: returning from a text should land the learner back on their
   * results, not reopen the keyboard over them.
   */
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    let focused = false;

    return navigation.addListener('transitionEnd', event => {
      if (event.data.closing || focused) return;
      focused = true;
      searchBarRef.current?.focus();
    });
  }, [navigation]);

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
    router.push(getArticleRoute(article.id));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <HeaderSearchBar
        ref={searchBarRef}
        autoFocus
        placeholder={STRINGS.SEARCH_TEXTS_PLACEHOLDER}
        onQueryChange={setQuery}
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
