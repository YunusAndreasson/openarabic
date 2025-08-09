### UI/UX Consistency – Actionable TODOs

- [x] Icons: replace outlined with filled where applicable

  - [x] `components/listen/DragHandle.tsx`: change `reorder-three-outline` to a filled icon (e.g., `reorder-three` or `menu`) and keep sizing consistent.

- [x] Touch feedback: unify interaction component and ripple behavior

  - [x] `components/listen/DragHandle.tsx`: switch `TouchableOpacity` to `Pressable` with `android_ripple={{ color: colors.navigationRipple }}` for consistency with cards and action icons.
  - [ ] Audit other icon-only touch targets to ensure `Pressable` + ripple is used consistently.

- [x] Scroll containers: standardize on `ThemedView` with `scrollable`

  - [x] `app/(tabs)/practice/index.tsx`: replace raw `ScrollView` with `<ThemedView scrollable>` to inherit consistent insets, indicators, and bounce props.
  - [x] `app/insights/index.tsx`: replace raw `ScrollView` with `<ThemedView scrollable>` for consistent behavior with account/read screens.
  - [ ] Optional: evaluate `components/FilterModal.tsx` and `components/settings/ArabicFontSelector.tsx` for using `ThemedView scrollable` if it improves consistency inside modal/setting contexts.

- [x] Scroll indicators: align visibility rules

  - [x] `app/(tabs)/read/account/islamicCalendar.tsx`: set `showsVerticalScrollIndicator={false}` to match the rest of the app.
  - [x] `components/home/FilteredArticleView.tsx` (normal mode): set `showsVerticalScrollIndicator={false}` to match edit mode and other lists.

- [x] Bottom padding and safe-area strategy: unify across tabs

  - [x] `app/insights/index.tsx`: update bottom padding to include bottom bar height like other tabs: `insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY`.
  - [ ] Verify `read`/`practice`/`listen` screens all include bottom bar height and are consistent with mini-player presence.

- [x] Ripple color: use a single semantic source

  - [x] `components/article/ArticleContent.tsx`: change Pressable ripple from `colors.tint` to `colors.navigationRipple` for consistency with `BaseCard` and other pressables.
  - [ ] Audit other Pressables to prefer `colors.navigationRipple` unless a specialized effect is intended.

- [ ] Modal dismissal patterns: align header vs inline close

  - [ ] Decide rule: modals with headers use `DoneButton`; full-bleed content modals use inline close. Apply chosen rule:
    - [ ] `app/insights/_layout.tsx`: currently uses header with `DoneButton` (OK if keeping this rule).
    - [ ] `components/article/ArticleContent.tsx`: currently uses inline close icon; confirm if article is a full-bleed modal. If not, move to header-based dismissal for consistency.

- [x] Top spacing under headers: standardize use of `headerHeight`

  - [x] `app/insights/index.tsx`: consider using `headerHeight`-aware offset when header is present, or codify a constant top spacing policy for modals with headers.
  - [ ] Verify `read`/`practice` screens’ use of `headerHeight` is consistent wherever headers are hidden.

- [ ] Empty state behavior: align cross-screen guidance

  - [ ] `app/(tabs)/practice/index.tsx`: currently avoids EmptyState; re-evaluate to align with Listen and FilteredArticle flows where EmptyState provides guidance when data is absent.

- [ ] Color semantics: ensure interactive “active” uses `tint`, not `success`

  - [ ] Audit components where `colors.success` is used in interactive contexts (toggles/buttons). Reserve `success` for semantic-positive visuals; keep “active” states on `colors.tint` per guideline.

- [ ] Haptics: prevent double feedback
  - [ ] Audit frequently tapped actions (e.g., play/stop, dictionary actions) to ensure only one haptic call per action path (either parent or child), leveraging the debounce in `utils/haptics.ts` and `hapticFeedback={false}` props where needed.

#### References (for quick navigation)

- Drag handle icon and touch: `components/listen/DragHandle.tsx`
- Practice screen scroll: `app/(tabs)/practice/index.tsx`
- Insights scroll and padding: `app/insights/index.tsx`, `app/insights/_layout.tsx`
- Account calendar indicator: `app/(tabs)/read/account/islamicCalendar.tsx`
- Filtered list indicator: `components/home/FilteredArticleView.tsx`
- Article close/ripples: `components/article/ArticleContent.tsx`
- Base card ripple reference: `components/BaseCard.tsx`
- Haptics helpers: `utils/haptics.ts`
