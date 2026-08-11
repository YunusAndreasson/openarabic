# Bottom Sheet Patterns (@gorhom/bottom-sheet v5)

> The app uses `<BottomSheet>` everywhere, never `<BottomSheetModal>` — a
> `BottomSheetModal` opened from a routed screen doesn't render on Android.
> There are exactly three instances: `WordDetailsBottomSheet`, `SettingsPicker`
> and `TimePicker`. Everything else that looks like a sheet is a
> `presentation: 'formSheet'` route — see `components/common/SheetScreen.tsx`.
>
> All three take `handleComponent={BrandedBottomSheetHandle}` and title
> themselves with `BottomSheetHeader`.

## Core Principles

- **Dynamic Sizing** prevents content cutoff by automatically adjusting to content height
- **Maximum Height Limits** prevent sheets from exceeding screen height
- **FlashList Integration** requires special configuration to avoid performance issues

## Sizing Strategy

### Use `enableDynamicSizing: true` when:

- Content height varies dynamically (charts, variable-length lists, user-generated content)
- You want automatic height adjustment to prevent content cutoff
- Content is simple (no scrollable lists exceeding 50 items)

```typescript
import { COMMON_BOTTOM_SHEET_PROPS } from '@/utils/bottomSheetUtils';

<BottomSheet {...COMMON_BOTTOM_SHEET_PROPS}>
  <BottomSheetView>
    <Chart data={dynamicData} />
  </BottomSheetView>
</BottomSheet>
```

### Use `enableDynamicSizing: false` + `snapPoints` when:

- Content has known, fixed height (pickers with specific option counts)
- You need precise control over sheet positions
- You want multiple snap positions for user interaction

```typescript
const SNAP_POINTS = [320]; // Fixed height for 4 options

<BottomSheet
  snapPoints={SNAP_POINTS}
  enableDynamicSizing={false}
  {...otherProps}
>
  <BottomSheetView>{/* Fixed height content */}</BottomSheetView>
</BottomSheet>
```

## Critical Configuration

### Always wrap content in BottomSheetView:

```typescript
// ✅ GOOD - Proper wrapper
<BottomSheet {...COMMON_BOTTOM_SHEET_PROPS}>
  <BottomSheetView style={styles.container}>
    {content}
  </BottomSheetView>
</BottomSheet>

// ❌ BAD - Missing wrapper
<BottomSheet {...COMMON_BOTTOM_SHEET_PROPS}>
  {content}
</BottomSheet>
```

### Use maxDynamicContentSize:

```typescript
// Automatically included in COMMON_BOTTOM_SHEET_PROPS
export const COMMON_BOTTOM_SHEET_PROPS = {
  enableDynamicSizing: true,
  maxDynamicContentSize: SCREEN_HEIGHT * 0.85,
  // ...other props
} as const;
```

## FlashList Integration (CRITICAL)

**Never use `BottomSheetFlashList` with `enableDynamicSizing: true`**

- Causes "Maximum call stack size exceeded" errors with 100+ items
- FlashList requires `enableDynamicSizing: false` with explicit `snapPoints`
- FlashList v2 automatically handles item sizing - no `estimatedItemSize` needed

```typescript
import { BottomSheetFlashList } from '@gorhom/bottom-sheet';

<BottomSheet
  snapPoints={[SCREEN_HEIGHT * 0.9]}
  enableDynamicSizing={false} // REQUIRED with lists
>
  <BottomSheetFlashList
    data={items}
    renderItem={renderItem}
  />
</BottomSheet>
```

## Common Utilities

Use shared utilities from `utils/bottomSheetUtils.tsx`:

- `COMMON_BOTTOM_SHEET_PROPS` — pan-to-close, no over-drag, and a
  `maxDynamicContentSize` of 85% of the screen. The only props export; a
  separate `COMMON_BOTTOM_SHEET_MODAL_PROPS` was documented here for a long time
  but never existed.
- `BottomSheetBackdrop` - Blur backdrop component (pass directly as `backdropComponent`)
- `useBottomSheetDynamicStyles()` — returns `{ bottomSheet }` for
  `backgroundStyle`. It has no `indicator` key; the grabber comes from
  `handleComponent={BrandedBottomSheetHandle}`.

## Snap Points Reference

From `constants/layout.ts`:

```typescript
BOTTOM_SHEET: {
  SNAP_POINTS: {
    WORD_DETAILS: 380,
    TIMER_COLLAPSED: 280,
    TIMER_EXPANDED: 380,
    SETTINGS_PICKER: 320,
  },
}
```
