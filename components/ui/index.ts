/**
 * UI Components — interactive controls and form primitives.
 *
 * Everything public is exported here; import from `@/components/ui`, not from
 * the individual files. (Layout, state and composition primitives live in
 * `@/components/common`.)
 *
 * ONE EXCEPTION: files *inside* `components/ui`, `components/common` and
 * `components/providers` must import each other by direct path, never through
 * either barrel. Going through a barrel pulls in every sibling, which closes an
 * import cycle — `ui/index` → `SettingsPicker` → `common/index` → `EmptyState`
 * → `ui/index`. Cycles resolve to `undefined` at module-init time, so the
 * failure is a blank component at runtime, not a build error.
 */

export { BrandedBottomSheetHandle } from './BrandedBottomSheetHandle';
export { CloseButton } from './CloseButton';
export { EnhancedImage } from './EnhancedImage';
// `HeaderIconButton` and `Toast` are deliberately not re-exported: their only
// consumers live inside components/ui and components/providers, which must import
// by direct path (see the cycle note above).
export { GlassIconButton } from './GlassIconButton';
export { Ionicons } from './Icon';
export type { IoniconName } from './Icon';
export { IconButton } from './IconButton';
export { PinnedActionButton, usePinnedActionClearance } from './PinnedActionButton';
export { PulsatingLoader } from './PulsatingLoader';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlOption } from './SegmentedControl';
export { SettingsPicker } from './SettingsPicker';
export { TextLink } from './TextLink';
export { TimePicker } from './TimePicker';
export { Toggle } from './Toggle';
export { TransparentHeaderButton } from './TransparentHeaderButton';
