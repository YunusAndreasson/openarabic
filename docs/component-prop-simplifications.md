### Component prop simplification findings

- **BottomControls (`components/BottomControls.tsx`)**

  - **Timer props are unused**: `showTimerButton`, `onTimerPress`, `isTimerActive` are never set by callers. Recommend removing these props and the related UI block.

    ```355:368:app/(tabs)/listen/index.tsx
    <BottomControls
      primaryDisabled={isPlayAllLoading}
      primaryLoading={isPlayAllLoading}
      primaryDisablePressAnimation={true}
      primaryLabel={STRINGS.PLAY_ALL}
      primaryVariant="filled"
      showTimerButton={false}
      onPrimaryPress={handlePlayAllStable}
    />
    ```

  - **Variant props are redundant**: Only usage sets `primaryVariant="filled"`, which matches the default. `secondaryVariant` is never overridden. Recommend hard-coding primary as filled and secondary as outlined and dropping both props.

- **DictionaryButton (`components/ui/DictionaryButton.tsx`)**

  - **Visibility props belong in wrapper**: `hideWhenEmpty` and `wordCount` are only used by the wrapper `PracticeDictionaryButton`. No direct call sites pass them. Recommend removing these props from `DictionaryButton` and keeping hide/show logic exclusively in the wrapper.

    ```105:118:components/ui/DictionaryButton.tsx
    export function PracticeDictionaryButton({
      style,
    }: { style?: ViewStyle } = {}): JSX.Element | null {
      ...
      return (
        <DictionaryButton hideWhenEmpty={true} wordCount={filteredStudyWords.length} style={style} />
      );
    }
    ```

- **EditModeButton (`components/ui/EditModeButton.tsx`)**

  - **Visibility props belong in wrapper**: `hideWhenEmpty` and `itemCount` are only consumed by `ListenEditModeButton`. Direct usages elsewhere never pass them. Recommend removing these props from `EditModeButton` and keeping the hide/show logic inside the wrapper.

    ```114:128:components/ui/EditModeButton.tsx
    export const ListenEditModeButton: FC<{ ... }> = ({ onEditModeChange, style }) => {
      const { sortedReadingList } = useListenScreen();
      return (
        <EditModeButton
          type="listen"
          hideWhenEmpty={true}
          itemCount={sortedReadingList.length}
          onEditModeChange={onEditModeChange}
          style={style}
        />
      );
    };
    ```

- **EnhancedImage (`components/EnhancedImage.tsx`)**

  - **Dead extension points**: `allowDownscaling` and `autoplay` are exposed but never used by callers. Defaults are always applied. Recommend removing these props from the public interface and always passing the defaults internally.

    ```100:131:components/audio/MiniPlayer.tsx
    <EnhancedImage
      source={article.image_url}
      style={styles.artwork}
      contentFit="cover"
      cachePolicy="disk"
    />
    ```

- **ProgressCircle (`components/ProgressCircle.tsx`)**

  - **Unused feature path**: `showPercentage` is never set to `true`. Only known usage passes `false`. Recommend removing the prop and the percentage text overlay to simplify the component.

    ```145:152:components/home/ArticleCard.tsx
    <ProgressCircle
      percentage={progressPercentage}
      size={28}
      strokeWidth={4}
      showPercentage={false}
      style={styles.progressCircle}
    />
    ```

- **Minor redundant prop passing to clean up (call sites)**
  - `BottomControls` in listen screen: `primaryVariant="filled"` and `showTimerButton={false}` are redundant with defaults (or removed props if simplified). Remove these explicit props.
  - `EnhancedImage` often passes `contentFit="cover"` which already matches component default. Safe to omit in `NowPlaying`, `MiniPlayer`, and both `ArticleCard` components.

### Notes

- ThemedButton `variant` is actively used as both `filled` and `outlined` (e.g., Sleep Timer, Account/Cache Clear), so it should be retained.
- ThemedView props (`useSafeArea`, `includeBottomInset`, `safeAreaEdges`) are variably used across screens; no obvious removals.
- `ArticleCard` (home) uses `hasStartedReading` alongside `progressPercentage`. While it looks duplicative, it conveys “started” even when percentage is 0 due to upstream `?? 0` defaulting, so keep both unless upstream typing changes.
