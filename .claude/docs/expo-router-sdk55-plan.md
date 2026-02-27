# Expo Router SDK 55 — Adoption Plan

## Current State

- `expo-router@^55.0.3` (Router v7, bundled with SDK 55)
- Dual tab implementation: `NativeTabs` on iOS, JS `Tabs` on Android
- Custom `MiniPlayer` overlay positioned above tab bar
- Custom header buttons via `createNavigationOptions()` utility
- Article navigation via `router.push(getArticleRoute(id, title))`
- Phone-only app (`supportsTablet: false`)

## Priority 1: Verify `reset` → `resetOnFocus` Breaking Change

**Effort**: Trivial | **Impact**: Potentially breaking

The `reset` prop on headless tabs was renamed to `resetOnFocus` in SDK 55.

**Action**:

- Search codebase for any usage of `reset` prop on tab components
- Rename to `resetOnFocus` if found
- If not used, no action needed

## Priority 2: `NativeTabs.BottomAccessory` — Native Mini Player

**Effort**: Medium | **Impact**: High

Replace custom `MiniPlayer` overlay with native `NativeTabs.BottomAccessory` on iOS. This renders an Apple Music-style floating element above the tab bar using native UIKit with liquid glass styling.

**Why**:

- Current MiniPlayer is a custom React Native view manually positioned above the tab bar
- `BottomAccessory` integrates natively with the tab bar (proper insets, animations, blur)
- Feels like a first-party iOS experience
- Falls back to no-op on Android — keep existing custom implementation there

**Implementation**:

- Import `NativeTabs.BottomAccessory` in `app/(tabs)/_layout.tsx`
- Wrap existing MiniPlayer content inside `BottomAccessory` for iOS path
- Keep current MiniPlayer rendering for Android path
- Test tab bar height/inset behavior with and without mini player visible
- Verify sleep timer UI still works correctly alongside it

**Files to modify**:

- `app/(tabs)/_layout.tsx` — add BottomAccessory to iOS NativeTabs layout
- Possibly `components/audio/MiniPlayer.tsx` — adapt styling for native container

**Open questions**:

- Does `BottomAccessory` support dynamic show/hide (mini player only visible during playback)?
- Does it handle safe area insets automatically?
- How does it interact with keyboard avoidance?

## Priority 3: Apple Zoom Transition — Article Cards

**Effort**: Low | **Impact**: Medium

Add native shared-element zoom transition from article cards to the article reader screen on iOS 18+.

**Why**:

- Premium feel with minimal code — wrapping article cards in `Link.AppleZoom`
- Native iOS zoom gesture for dismiss (swipe down to shrink back to card)
- Graceful degradation on older iOS / Android (standard push transition)

**Limitations**:

- iOS 18+ only
- Requires Stack navigator (article screen is already in a Stack)
- Incompatible with modal presentation — article screen currently uses Stack, so this should work
- Single child enforcement on `Link.AppleZoom`

**Implementation**:

- Wrap article card press handler with `Link.AppleZoom` in explore tab
- Add `Link.AppleZoomTarget` in article screen for alignment
- Optionally use `usePreventZoomTransitionDismissal()` if article has unsaved state
- Test with various article card sizes and image loading states

**Files to modify**:

- Article card component (wherever cards are rendered in explore tab)
- `app/article/[id].tsx` — add `Link.AppleZoomTarget`
- Possibly `utils/routeBuilders.ts` — may need to adapt `getArticleRoute` for Link component usage

**Open questions**:

- Does the zoom transition work with `freezeOnBlur: true` on the article screen?
- How does it behave when article card has an image still loading?
- Can it coexist with the existing `slide_from_bottom` animation config?

## Priority 4: `Stack.Toolbar` — Native Toolbar Actions

**Effort**: Low-Medium | **Impact**: Medium

Replace custom header buttons in article reader and modals with native `Stack.Toolbar` components on iOS.

**Why**:

- Native `UIToolbar` buttons, menus, and badges
- Supports dropdown menus via `Stack.Toolbar.Menu` (useful for article actions: share, bookmark, font size)
- Supports bottom toolbar placement for review screen actions
- Badge support for notification-style indicators
- Consistent with iOS design language

**Candidates for adoption**:

- Article screen header: reading list toggle, font selector, share
- Review screen: bottom action buttons (could move to native bottom toolbar)
- Account modals: close/done buttons

**Implementation**:

- Start with article screen header as proof of concept
- Replace custom `FloatingActionButtons` with `Stack.Toolbar.Button` items
- Use `Stack.Toolbar.Menu` for grouped actions (font, share, etc.)
- Test on Android (falls back to standard header buttons)

**Files to modify**:

- `app/article/[id].tsx` — adopt Stack.Toolbar for header/bottom actions
- `components/article/FloatingActionButtons.tsx` — may become iOS-only or removed
- `app/(tabs)/practice/review.tsx` — bottom toolbar for review actions

**Open questions**:

- How does `Stack.Toolbar` interact with custom `createNavigationOptions()` headers?
- Can bottom toolbar coexist with floating action buttons on Android?
- Does `Stack.Toolbar.Menu` support custom styling or is it system-only?

## Lower Priority / Future Consideration

### Colors API (Platform-Adaptive Colors)

- Material 3 dynamic colors on Android, adaptive system colors on iOS
- Could complement the existing theme system but would require significant refactoring
- Consider when/if doing a theme system overhaul

### `listeners` / `screenListeners` on NativeTabs

- Could simplify tab focus tracking for analytics or data refreshing
- Low urgency — current approach works

### Declarative Header Components API

- Alternative to `options` object for setting header content
- Matter of preference — evaluate if `createNavigationOptions()` utility becomes unwieldy

## Free Wins (Already Active)

These are enabled by default in SDK 55 — no code changes needed:

- **Synchronous layout updates** — fewer layout jumps during transitions
- **`iosPreventReattachmentOfDismissedScreens`** — smoother iOS modal dismissals
- **Default safe area handling** in NativeTabs layouts
- **Reduced UIBarButtonItem recreation** on iOS

## Not Applicable

| Feature                              | Reason                                      |
| ------------------------------------ | ------------------------------------------- |
| SplitView                            | App is phone-only (`supportsTablet: false`) |
| Server data loaders                  | Not using SSR or server routes              |
| `ExpoRequest`/`ExpoResponse` removal | Not using server routes                     |
| Form sheet liquid glass              | iOS 26 specific, revisit later              |
