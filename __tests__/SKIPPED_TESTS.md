# Skipped Tests Tracking

This document tracks all skipped tests in the codebase, their root causes, and action items for resolution.

## Summary

| File                           | Skipped Count | Root Cause                            | Priority |
| ------------------------------ | ------------- | ------------------------------------- | -------- |
| `hooks/useReview.test.tsx`     | 4             | Async timing with audioCache.getAudio | Medium   |
| `services/audioPlayer.test.ts` | 4             | AppState mock isolation conflicts     | Low      |

**Total: 8 skipped tests**

---

## hooks/useReview.test.tsx (4 tests)

### Root Cause

Complex async timing issue with `audioCache.getAudio` promise resolution. The `audioUrl` is `undefined` when `mockAudioPlayer.play` is called, suggesting the promise from `audioCache.getAudio` is not resolving before the synchronous `setTimer` callback completes.

**Important:** This is a test infrastructure issue, not a production bug. Audio works correctly in the app.

### Skipped Tests

#### 1. `should play Arabic audio when word loads` (line 304)

- **Location:** `describe('Audio Playback')`
- **Expected behavior:** Arabic audio plays automatically when a word card loads
- **Test issue:** Promise timing - audioCache.getAudio resolves after assertions run

#### 2. `should play English audio for unknown words` (line 531)

- **Location:** `describe('Unknown Word Specific Behavior')`
- **Expected behavior:** English audio plays for unknown words (swipe left)
- **Test issue:** Same promise timing issue as #1

#### 3. `should handle audio playback errors gracefully` (line 752)

- **Location:** `describe('Error Handling')`
- **Expected behavior:** Hook handles audio errors without crashing
- **Test issue:** Same promise timing issue as #1

#### 4. `should play audio after preloading completes` (line 1019)

- **Location:** `describe('Audio Preloading Integration')`
- **Expected behavior:** Audio plays immediately after preloading finishes
- **Test issue:** Same promise timing issue as #1

### Resolution Options

1. **Mock `audioCache.getAudio` to resolve synchronously:**

   ```typescript
   jest.mock('@/services/audioCache', () => ({
     audioCache: {
       getAudio: jest.fn((url: string) => url), // Sync instead of Promise
     },
   }));
   ```

2. **Use proper async/await with act():**

   ```typescript
   await act(async () => {
     result.current.handleSwipeLeft();
     await Promise.resolve(); // Flush microtasks
     await Promise.resolve(); // Additional flush
   });
   ```

3. **Refactor setTimer mock to handle async callbacks:**
   The current mock executes callbacks synchronously. Consider using Jest's fake timers with proper promise flushing.

---

## services/audioPlayer.test.ts (4 tests)

### Root Cause

Test isolation issue - AppState mock from `react-native` conflicts with other test files. The mock state persists across tests, causing unpredictable behavior.

### Skipped Tests

#### 1. `should setup AppState listener on audio session configuration` (line 740)

- **Location:** `describe('Background Audio Handling')`
- **Expected behavior:** AppState listener is registered when audio session starts
- **Test issue:** AppState mock conflicts between test files

#### 2. `should maintain audio session when app goes to background` (line 747)

- **Location:** `describe('Background Audio Handling')`
- **Expected behavior:** Audio continues when app backgrounds
- **Test issue:** Same mock isolation issue

#### 3. `should maintain audio session when app returns to foreground` (line 759)

- **Location:** `describe('Background Audio Handling')`
- **Expected behavior:** Audio session is preserved on foreground return
- **Test issue:** Same mock isolation issue

#### 4. `should remove AppState listener on destroy` (line 796)

- **Location:** `describe('Background Audio Handling')`
- **Expected behavior:** Listener cleanup on service destroy
- **Test issue:** Same mock isolation issue

### Resolution Options

1. **Isolate AppState mock per test file:**

   ```typescript
   beforeEach(() => {
     jest.isolateModules(() => {
       // Re-import AppState with fresh mock
     });
   });
   ```

2. **Use jest.resetModules() in beforeEach:**

   ```typescript
   beforeEach(() => {
     jest.resetModules();
     // Re-setup mocks
   });
   ```

3. **Create dedicated test file for AppState tests:**
   Move background audio tests to a separate file with isolated mock setup.

---

## Contributing

When skipping a test:

1. Add an entry to this document
2. Include a `// SKIP:` comment with brief explanation in the test file
3. Link to a GitHub issue if the fix is non-trivial
4. Assign a priority (High/Medium/Low) based on test coverage impact

When fixing a skipped test:

1. Remove the `.skip` modifier
2. Update this document
3. Consider adding regression prevention in the test
