# Expo Audio SDK 55 — Adoption Plan

## Current State

- `expo-audio@~55.0.8` (SDK 55)
- Custom `SimpleAudioService` singleton managing all playback
- Manual playlist logic with race condition guards (~200+ lines)
- File-based audio caching via `AudioCacheManager`
- Background playback enabled, no lock screen controls
- No recording (disabled in config)

## Priority 1: Lock Screen Controls

**Effort**: Low-Medium | **Impact**: High

Add `setActiveForLockScreen()` for metadata display and playback controls on lock screen/notification.

**Why**:

- Users can't control playback without opening the app
- On Android, background audio may stop after ~3 minutes without this
- Straightforward to add to existing `SimpleAudioService.play()` flow

**Implementation**:

- Call `player.setActiveForLockScreen(true, { title, artist, artworkUrl })` after player starts
- Update metadata on track change via `player.updateLockScreenMetadata()`
- Clear on stop via `player.clearLockScreenControls()`
- May need `interruptionMode: 'doNotMix'` (currently `duckOthers` — verify compatibility)

**Files to modify**:

- `services/audioPlayer.ts` — add lock screen activation in play flow
- `types/audio.types.ts` — extend `EnhancedAudioTrack` if needed for metadata

## Priority 2: Native Audio Preloading

**Effort**: Low | **Impact**: Medium-High

Use `preload()` API to buffer audio at the native player level for near-instant playback.

**Why**:

- Complements existing file cache (network→disk is handled; disk→player buffer is not)
- Near-zero startup latency when combined with `AudioCacheManager`
- Simple additive change, no refactoring needed

**Implementation**:

- `preload(nextTrackUrl)` when current track starts playing (playlist mode)
- `preload()` during `useAudioPreloader` batch processing (vocabulary sessions)
- Use `clearPreloadedSource()` on cleanup to manage memory

**Files to modify**:

- `services/audioPlayer.ts` — preload next track in playlist after current starts
- `hooks/review/useAudioPreloader.ts` — add native preload alongside file cache

## Priority 3: `useAudioPlaylist` Migration

**Effort**: High | **Impact**: High

Replace manual playlist management with native `useAudioPlaylist` API.

**Why**:

- Eliminates ~200 lines of manual track advancement, race condition guards, `isAdvancingTrack` flag
- Native gapless playback (AVQueuePlayer on iOS, ExoPlayer on Android)
- Built-in loop modes (`none`, `single`, `all`)
- Built-in queue management (`add`, `remove`, `insert`, `skipTo`)

**Risks & open questions**:

- Sleep timer integration — need to verify `useAudioPlaylist` exposes enough control to pause advancement
- Transition sound between tracks — gapless playback may make this unnecessary, but verify UX
- Lock screen controls — verify compatibility with playlist API
- Audio caching — need to confirm preloaded/cached URLs work with playlist sources

**Implementation approach**:

1. Build on a separate branch
2. Create a new `usePlaylistPlayer` hook wrapping `useAudioPlaylist`
3. Integrate sleep timer logic
4. Test gapless playback quality (does it feel right without transition sounds?)
5. Migrate `useGlobalAudioState` to use new hook
6. Remove old playlist logic from `SimpleAudioService`

**Files to modify**:

- `services/audioPlayer.ts` — remove playlist management code
- `hooks/audio/useGlobalAudioState.ts` — rewire to `useAudioPlaylist`
- New hook: `hooks/audio/usePlaylistPlayer.ts`
- `utils/transitionSound.ts` — may become unnecessary

## Not Adopting

| Feature                  | Reason                                        |
| ------------------------ | --------------------------------------------- |
| `mixWithOthers`          | `duckOthers` is correct for language learning |
| `useAudioSampleListener` | No waveform UI needed                         |
| Earpiece routing         | Not relevant                                  |
| Background recording     | Recording is disabled                         |
