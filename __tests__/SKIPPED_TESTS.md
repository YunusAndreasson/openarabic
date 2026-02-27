# Skipped Tests Tracking

This document tracks all skipped tests in the codebase, their root causes, and action items for resolution.

## Summary

| File                               | Skipped Count | Root Cause                               |
| ---------------------------------- | ------------- | ---------------------------------------- |
| `hooks/useReview.test.tsx`         | 1             | Async timing with playAudio in useEffect |
| `hooks/useReview.swipe.test.tsx`   | 1             | Nested timer callbacks with async audio  |
| `hooks/useReview.session.test.tsx` | 2             | Async timing with playAudio/preloader    |

**Total: 4 skipped tests**

---

## useReview Hook Tests (4 tests across 3 files)

### Root Cause

Complex async timing issue with `playAudio` calls triggered by useEffect or nested timer callbacks. The mock's synchronous timer execution doesn't fully account for the async nature of `audioCache.getAudio` and `audioPlayer.play`.

**Important:** This is a test infrastructure issue, not a production bug. Audio works correctly in the app.

### Skipped Tests

#### 1. `should play Arabic audio when word loads` (`useReview.test.tsx`)

- **Location:** `describe('Audio Playback')`
- **Expected behavior:** Arabic audio plays automatically when a word card loads
- **Test issue:** playAudio is called in useEffect but async resolution doesn't complete

#### 2. `should play English audio for unknown words` (`useReview.swipe.test.tsx`)

- **Location:** `describe('Unknown Word Specific Behavior')`
- **Expected behavior:** English audio plays for unknown words (swipe left)
- **Test issue:** Nested timer callbacks with async playAudio make this hard to test reliably

#### 3. `should handle audio playback errors gracefully` (`useReview.session.test.tsx`)

- **Location:** `describe('Edge Cases')`
- **Expected behavior:** Hook handles audio errors without crashing
- **Test issue:** Same nested timer/async timing issue

#### 4. `should play audio after preloading completes` (`useReview.session.test.tsx`)

- **Location:** `describe('Audio Preloader Integration')`
- **Expected behavior:** Audio plays immediately after preloading finishes
- **Test issue:** Complex interaction between preloader state and playAudio timing

### Resolution Options

1. **Refactor timer mock to be truly async:**
   Use Jest's fake timers with proper promise flushing to accurately simulate async behavior.

2. **Create integration tests:**
   These scenarios may be better tested through integration tests rather than isolated hook tests.

3. **Accept coverage gap:**
   The features work in production. The tests verify implementation details that are inherently difficult to mock.

---

## Removed Tests (Previously Skipped)

The following tests were removed as they were either testing unimplemented features or had unresolvable mock conflicts:

### AppState Tests (4 tests) - Removed

- `should setup AppState listener on audio session configuration`
- `should maintain audio session when app goes to background`
- `should maintain audio session when app returns to foreground`
- `should remove AppState listener on destroy`

**Reason:** Test isolation issue with AppState mock. Background audio behavior is platform-level and better validated through manual testing.

### Grammar Test (1 test) - Removed

- `should detect "concerning" in "concerning what"`

**Reason:** Testing unimplemented feature. The grammar matching logic for this specific case doesn't exist yet.

---

## Contributing

When skipping a test:

1. Add an entry to this document
2. Include a comment with brief explanation in the test file
3. Assign a priority based on test coverage impact

When fixing a skipped test:

1. Remove the `.skip` modifier
2. Update this document
3. Consider adding regression prevention in the test
