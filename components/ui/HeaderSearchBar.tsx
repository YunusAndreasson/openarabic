import { Stack } from 'expo-router';
import type { JSX, RefObject } from 'react';
import type { SearchBarCommands } from 'react-native-screens';

import { useColors } from '@/hooks/theme/useColors';

interface HeaderSearchBarProps {
  readonly placeholder: string;
  /** Every change to the query, including the clear on cancel or close. */
  readonly onQueryChange: (query: string) => void;
  /** Focus and blur by hand — see the Explore search screen for why iOS needs it. */
  readonly ref?: RefObject<SearchBarCommands | null>;
  /** Android only: on iOS the field does not exist yet at mount. */
  readonly autoFocus?: boolean;
}

/**
 * The native header search bar (UISearchController on iOS, SearchView on
 * Android), set up the way every search screen in the app wants it.
 *
 * `Stack.SearchBar` renders nothing: it registers its props as the screen's
 * header options from wherever it sits in the screen's tree, so a wrapper like
 * this works the same as rendering it in the page.
 */
export function HeaderSearchBar({
  placeholder,
  onQueryChange,
  ref,
  autoFocus,
}: HeaderSearchBarProps): JSX.Element {
  const colors = useColors();

  return (
    <Stack.SearchBar
      ref={ref}
      autoFocus={autoFocus}
      placeholder={placeholder}
      hideWhenScrolling={false}
      autoCapitalize="none"
      onChangeText={event => onQueryChange(event.nativeEvent.text)}
      onCancelButtonPress={() => onQueryChange('')}
      onClose={() => onQueryChange('')}
      // Android SearchView colors (iOS adapts to the theme on its own)
      headerIconColor={colors.text}
      textColor={colors.text}
      hintTextColor={colors.textTertiary}
    />
  );
}
