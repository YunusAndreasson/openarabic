# Bottom Sheet Patterns (@gorhom/bottom-sheet v5.2.6)

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
import { COMMON_BOTTOM_SHEET_MODAL_PROPS } from '@/utils/bottomSheetUtils';

<BottomSheetModal {...COMMON_BOTTOM_SHEET_MODAL_PROPS}>
  <BottomSheetView>
    <Chart data={dynamicData} />
  </BottomSheetView>
</BottomSheetModal>
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
<BottomSheetModal {...COMMON_BOTTOM_SHEET_MODAL_PROPS}>
  <BottomSheetView style={styles.container}>
    {content}
  </BottomSheetView>
</BottomSheetModal>

// ❌ BAD - Missing wrapper
<BottomSheetModal {...COMMON_BOTTOM_SHEET_MODAL_PROPS}>
  {content}
</BottomSheetModal>
```

### Use maxDynamicContentSize:

```typescript
// Automatically included in COMMON_BOTTOM_SHEET_MODAL_PROPS
export const COMMON_BOTTOM_SHEET_MODAL_PROPS = {
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

<BottomSheetModal
  snapPoints={[SCREEN_HEIGHT * 0.9]}
  enableDynamicSizing={false} // REQUIRED with lists
>
  <BottomSheetFlashList
    data={items}
    renderItem={renderItem}
  />
</BottomSheetModal>
```

## Common Utilities

Use shared utilities from `utils/bottomSheetUtils.tsx`:

- `COMMON_BOTTOM_SHEET_PROPS` - For regular BottomSheet with snapPoints
- `COMMON_BOTTOM_SHEET_MODAL_PROPS` - For BottomSheetModal with dynamic sizing
- `BottomSheetBackdrop` - Blur backdrop component (pass directly as `backdropComponent`)

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
