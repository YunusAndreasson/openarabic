# Voice-Based Review (Speech Input) – Implementation Plan

## Objective

Replace swipe interactions in the review flow with an additional voice input: the user can still swipe left/right, and can also press a mic button between those two to speak the English word. If recognized correctly, we advance automatically. The solution must be decoupled from any single STT provider so we can swap providers later, but in this development phase we will call OpenAI’s audio transcription API directly from the client (no backend).

## Environment & Constraints

- React Native 0.79.5, Expo SDK 53 (New Architecture enabled)
- Existing audio stack: `expo-audio@0.4.8`, `expo-file-system`
- State/data: Redux Toolkit + TanStack Query, FSRS review logic in hooks
- Mobile-only app
- Strict TypeScript; hooks for business logic; functional components only
- No backend/edge function available; direct OpenAI API calls from app (development-only)

## Evaluate Available Libraries (recording + STT)

### Microphone Recording (Expo)

- expo-audio: modern Expo module for playback and recording; supports Recorder with permission gating and file output (e.g., m4a). Works in Expo without custom native code.
- expo-av: legacy; not installed. Prefer `expo-audio` which we already use for playback.

Conclusion: Use `expo-audio` Recorder to capture short speech clips (m4a), then upload via `fetch` + `FormData`.

### STT Providers

- Direct OpenAI (no backend): `POST https://api.openai.com/v1/audio/transcriptions` with `model` (e.g., `whisper-1` or `gpt-4o-mini-transcribe`), `file` (m4a). Requires including API key in app (dev only). RN `fetch` supports multipart with `{ uri, name, type }`.
- Conclusion: Use a direct OpenAI provider via a simple provider interface.

## Integration Points (current review flow)

The review UI uses `useReview()` and exposes swipe handlers:

```18:122:app/practice/review.tsx
// ... existing code ...
<ReviewCard
  key={currentWordKey}
  fontSize={wordFontSize}
  isTransitioning={isTransitioningToCompletion}
  isUpdating={isUpdating}
  opacityStyle={animatedStyle}
  testID="review-card"
  word={currentSentence.wordForm}
  onSwipeLeft={handleSwipeLeft}
  onSwipeRight={handleSwipeRight}
/>
// ... existing code ...
```

```92:614:hooks/review/useReview.tsx
// ... existing code ...
const handleSwipeLeft = () => {
  handleKnowledgeResponse('unknown');
};

const handleSwipeRight = () => {
  handleKnowledgeResponse('known');
};
// ... existing code ...
```

Plan: Keep swipes unchanged. Add a centered mic button between the existing left/right controls; pressing it runs the voice flow and, on success, calls `handleKnowledgeResponse('known')`. On incorrect transcript, call `handleKnowledgeResponse('unknown')` so the English meaning displays/reads exactly as today.

## Architecture

- UI layer (Review screen bottom controls): add mic button centered between the left and right actions.
- Recording layer: capture audio to a temporary file (`m4a`) via `expo-audio` Recorder.
- STT Provider layer (pluggable): one provider for direct OpenAI requests now; interface remains generic.
- Evaluation layer: normalize transcript and compare to the target English answer with fuzzy matching.
- Review controller: on correct transcript → trigger `known`; on incorrect or timeout → trigger `unknown` to mirror existing behavior.

### Module Layout

- `services/stt/types.ts` – Provider interface and common types
- `services/stt/providers/openaiDirect.ts` – Direct `fetch` to OpenAI Whisper/gpt-4o-mini-transcribe
- `services/stt/providerFactory.ts` – Factory to select provider (default: `openai-direct`)
- `hooks/review/useVoiceReview.ts` – Orchestrates permissions, recording, upload, transcription, evaluation, and triggers review callbacks
- `components/review/VoiceControls.tsx` – Mic button with idle/recording/transcribing/success/error states (placed between swipe buttons)
- `utils/speech/evaluateTranscript.ts` – Normalization and fuzzy match helper

## TypeScript Interfaces (decoupled provider)

```ts
// services/stt/types.ts
export interface TranscriptionResult {
  readonly text: string;
  readonly confidence?: number;
  readonly language?: string;
}

export interface SttProvider {
  transcribeLocalFileAsync(params: {
    fileUri: string; // file:/// URI from recorder
    mimeType?: string; // e.g., 'audio/m4a'
    signal?: AbortSignal;
  }): Promise<TranscriptionResult>;
}
```

Provider factory:

```ts
// services/stt/providerFactory.ts
export type ProviderId = 'openai-direct';
export function createSttProvider(id: ProviderId): SttProvider {
  // switch between providers
}
```

## Direct OpenAI (no backend)

- Endpoint: `POST https://api.openai.com/v1/audio/transcriptions`
- Model: `gpt-4o-mini-transcribe`
- Headers: `Authorization: Bearer <EXPO_PUBLIC_OPENAI_API_KEY>`
- Body: `FormData` with `file` and `model`

Example outline (React Native `fetch` + FormData):

```ts
const form = new FormData();
form.append('model', 'gpt-4o-mini-transcribe');
form.append('file', {
  uri: fileUri,
  name: 'speech.m4a',
  type: 'audio/m4a',
} as any);

const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
    // Do not set Content-Type; RN sets multipart boundary automatically
  },
  body: form,
});
const json = await res.json();
// json.text contains transcript
```

Security note (development only): `EXPO_PUBLIC_OPENAI_API_KEY` will be bundled in the app; treat this flow as dev-only and rotate keys frequently. For production, move to a secure backend proxy.

## Recording Flow (expo-audio)

- Request microphone permission on first use
- Configure recorder: mono, 16–48 kHz; container `m4a` (AAC)
- Mic button toggles recording ON/OFF:
  - First tap: start recording
  - Second tap (or auto-timeout ~4–6s): stop recording and begin transcription
- Use the returned file URI for transcription

## Recording Readiness (gating)

Only listen when we truly expect speech to avoid capturing app audio and transitions.

- Ready when: `!isUpdating && !isTransitioningToCompletion && !showMeaningOverlay`
- Debounce enable 500ms after `currentWordKey` changes (word settled)
- Disable mic while transcribing/uploading
- If readiness becomes false mid-recording, stop immediately and discard clip
- Do not auto-start recording; always manual toggle
- After incorrect (meaning shown/read): do not auto-rearm; require manual press
- After correct (advance): disable until next word settles + debounce

## Evaluation (robust but simple)

Goal: avoid over-complication while being resilient to minor ASR noise.

- Normalize both strings: lowercase, trim, collapse whitespace, strip punctuation/apostrophes.
- Acceptance cascade (single or multi-word):
  1. Exact match → accept
  2. Jaro–Winkler ≥ 0.92 → accept
  3. Levenshtein threshold by length:
     - length ≤ 5: distance ≤ 1
     - 6–8: distance ≤ 2
     - > 8: distance ≤ 2 or Jaro–Winkler ≥ 0.90
  4. Multi-word phrases: compare token-by-token using same rules; accept if all tokens pass or ≥80% tokens pass
- Configuration: expose thresholds in a small constants object for quick tuning.
- Implementation: zero-dependency utility in `utils/speech/evaluateTranscript.ts` implementing minimal Jaro–Winkler and Levenshtein (small, fast).

Example signature:

```ts
export function isCorrectPronunciation({
  target,
  transcript,
}: {
  target: string;
  transcript: string;
}): boolean {
  // normalize and compare using the above cascade
}
```

## UI/UX (minimal change)

- Keep existing left/right swipe actions unchanged
- Add a centered mic button between them (toggle on/off; `MIN_TOUCH_TARGET` compliant)
- States: idle → recording (pulse) → transcribing (spinner) → success (brief tick) or show meaning (unknown path)
- Haptics on press/release; avoid double haptics per existing rule

## One-Pass Implementation Checklist

- Add provider interface and factory:
  - `services/stt/types.ts`, `services/stt/providerFactory.ts`
- Implement direct OpenAI provider:
  - `services/stt/providers/openaiDirect.ts` using RN `fetch` to OpenAI
- Add evaluation utils:
  - `utils/speech/evaluateTranscript.ts` with normalization, Jaro–Winkler, Levenshtein, and thresholds
- Add review voice hook:
  - `hooks/review/useVoiceReview.ts` (permissions, record, upload, evaluate)
  - Accept inputs: `isReadyForSpeech: boolean`, `currentWordKey: string`
  - Debounce internal readiness 500ms after `currentWordKey` changes
  - Guard `toggleRecording`: no-op when `!isReadyForSpeech` or `isTranscribing`
  - If readiness becomes false mid-recording, stop and discard
  - On correct transcript: `handleKnowledgeResponse('known')`
  - On incorrect/timeout: `handleKnowledgeResponse('unknown')` (shows/reads meaning exactly as today)
- Add mic UI component:
  - `components/review/VoiceControls.tsx` and place it between existing controls in `ReviewBottomActions`
  - Props: `{ isReadyForSpeech: boolean; currentWordKey: string; onKnown: () => void; onUnknown: () => void }`
  - Disable mic button when `!isReadyForSpeech` or transcribing; show spinner during transcribing
- Insert gating and threading:
  - In `app/practice/review.tsx`, compute `isReadyForSpeech = !isUpdating && !isTransitioningToCompletion && !showMeaningOverlay`
  - Pass `isReadyForSpeech` and `currentWordKey` to `ReviewBottomActions`
  - Update `components/review/ReviewBottomActions.tsx` to thread these to `VoiceControls`
- Config (dev only):
  - Add `EXPO_PUBLIC_OPENAI_API_KEY` to local env; do not commit real keys

## Risks & Notes

- API key exposure: acceptable for development; rotate keys. For production, move to backend proxy.
- Latency: keep clips short; `m4a` is efficient; network-dependent.
- Recognition errors: users can retry mic or use swipes; incorrect mirrors left swipe.

---

This plan keeps swipes, adds a centered mic toggle, calls OpenAI directly from the client in development, and mirrors today’s behavior: correct → advance; incorrect → show/read meaning, using the same paths as left/right swipes, with simple but robust transcript matching that avoids heavy dependencies.

## One-Pass Implementation Guide (for AI Agent)

1. Config: OpenAI key (development only)

   - Add `EXPO_PUBLIC_OPENAI_API_KEY` locally (do not commit real keys).
   - Acceptance: `process.env.EXPO_PUBLIC_OPENAI_API_KEY` resolves at runtime.

2. STT types and provider factory

   - Create `services/stt/types.ts` with `TranscriptionResult` and `SttProvider` interface.
   - Create `services/stt/providerFactory.ts` with `createSttProvider('openai-direct')` returning OpenAI provider.
   - Acceptance: TypeScript compiles; factory returns a provider instance.

3. OpenAI direct provider (no backend)

   - Create `services/stt/providers/openaiDirect.ts` exporting `openAiDirectProvider: SttProvider`.
   - Implement `transcribeLocalFileAsync({ fileUri, mimeType })` using `fetch` + `FormData` to `https://api.openai.com/v1/audio/transcriptions`.
     - Headers: `Authorization: Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`
     - Body: `model`=`gpt-4o-mini-transcribe` (or `whisper-1`) and `file` `{ uri, name:'speech.m4a', type:'audio/m4a' }`
     - Do not set `Content-Type` manually.
   - Return `{ text }` from response JSON.
   - Acceptance: Manual test confirms a short `m4a` upload yields `text`.

4. Transcript evaluation utility (zero-dependency)

   - Create `utils/speech/evaluateTranscript.ts` exporting:
     - `normalizeForCompare(input: string): string`
     - `levenshtein(a: string, b: string): number` (small implementation)
     - `jaroWinkler(a: string, b: string): number` (small implementation)
     - `isCorrectPronunciation({ target, transcript }): boolean` implementing the cascade:
       - normalize; exact; Jaro–Winkler ≥ 0.92; Levenshtein thresholds by length; token mode with ≥80% tokens pass
   - Acceptance: Unit tests (basic) pass for a few representative cases.

5. Voice hook

   - Create `hooks/review/useVoiceReview.ts` exporting `useVoiceReview({ onKnown, onUnknown })`.
   - Responsibilities:
     - Request mic permission on first use
     - Start/stop recording using `expo-audio` to `m4a` on toggle
     - After stop: call provider to transcribe, then evaluate via `isCorrectPronunciation`
     - On pass → `onKnown()`; on fail/timeout → `onUnknown()`
     - Expose: `isRecording`, `isTranscribing`, `toggleRecording`
   - Acceptance: Hook toggles record, returns transcript, and calls provided callbacks appropriately.

6. Voice UI component

   - Create `components/review/VoiceControls.tsx` exporting default component with props:
     - `{ onKnown: () => void; onUnknown: () => void }`
   - Internally uses `useVoiceReview` and renders a center mic button (toggle on/off) with small spinner during transcribing.
   - Visual: use Ionicons `mic` when idle, `stop` when recording; size per `MIN_TOUCH_TARGET`; tint per theme.
   - Acceptance: Button toggles recording; spinner shows while uploading/transcribing.

7. Insert mic between swipe indicators

   - Update `components/review/ReviewBottomActions.tsx`:
     - Import `VoiceControls`.
     - Layout: left indicator (Don’t know), center `<VoiceControls onKnown={...} onUnknown={...} />`, right indicator (Know).
     - Add props to `ReviewBottomActions`: `{ onKnownFromVoice: () => void; onUnknownFromVoice: () => void }` and thread them to `VoiceControls`.
   - Acceptance: Bottom area shows left indicator, center mic, right indicator; TypeScript compiles.

8. Thread callbacks from Review screen

   - In `app/practice/review.tsx`, pass closures to `ReviewBottomActions`:
     - `onKnownFromVoice={() => handleSwipeRight()}`
     - `onUnknownFromVoice={() => handleSwipeLeft()}`
   - Acceptance: Voice success triggers the same path as right swipe; failure triggers same path as left swipe (meaning overlay/audio exactly as today).

9. Minimal tests

   - Add a small test for `isCorrectPronunciation` covering exact, near-match, and fail.
   - Acceptance: `yarn test` passes.

10. QA checklist

- Swipes still work unchanged.
- Mic toggles record; short clip (≈4–6s) uploads; success advances; failure shows meaning overlay exactly as today.
- Errors (permission denied, network, 4xx/5xx) show graceful retry and do not crash UI.
