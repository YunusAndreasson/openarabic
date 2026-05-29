/**
 * Central icon component for the app.
 *
 * Wraps `@react-native-vector-icons/ionicons` (the SDK 56+ replacement for the
 * deprecated `@expo/vector-icons` family). All Ionicons usage in the codebase
 * goes through this module so the next icon-package migration is a one-file
 * change.
 *
 * The type re-export `IoniconName` is the modern equivalent of the legacy
 * `keyof typeof Ionicons.glyphMap` — use it for `name` props on call sites.
 */
import Ionicons from '@react-native-vector-icons/ionicons';

export { Ionicons };

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
