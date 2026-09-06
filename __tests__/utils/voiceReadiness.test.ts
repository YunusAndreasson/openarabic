/**
 * The single resolver behind every voice status surface.
 *
 * Three screens used to answer this question independently and disagreed — most
 * visibly the Practice settings row, which claimed "Answer out loud instead of
 * tapping" whenever the toggle was off, including while a download ran under it.
 */
import { voiceReadiness } from '@/utils/voiceReadiness';
import type { VoiceModelSnapshot, VoiceModelState } from '@/services/voiceModelStore';

const model = (
  state: VoiceModelState,
  overrides: Partial<VoiceModelSnapshot> = {},
): VoiceModelSnapshot => ({
  state,
  progress: 0,
  localPath: state === 'ready' ? '/mock/model/path' : null,
  error: null,
  errorKind: null,
  ...overrides,
});

const engine = (
  overrides: Partial<{ isReady: boolean; isWarming: boolean; error: Error | null }>,
) => ({
  isReady: false,
  isWarming: false,
  error: null,
  ...overrides,
});

describe('voiceReadiness', () => {
  it('keeps microphone denial actionable even when the recognizer is ready', () => {
    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: true,
        model: model('ready'),
        engine: engine({ isReady: true }),
      }),
    ).toEqual({ kind: 'mic-denied' });
  });

  it('reports off whenever the learner has turned voice off, whatever the model is doing', () => {
    const states: VoiceModelState[] = ['unknown', 'absent', 'downloading', 'ready', 'failed'];
    for (const state of states) {
      expect(
        voiceReadiness({
          voiceEnabled: false,
          micDenied: false,
          model: model(state),
          engine: engine({ isReady: state === 'ready' }),
        }),
      ).toEqual({ kind: 'off' });
    }
  });

  it('distinguishes a downloaded model from a loaded recognizer', () => {
    // FOUND ON DEVICE. Folding this into `preparing` made the Settings screen
    // say "Downloading 100%" about a model that had finished downloading days
    // earlier — the engine is simply not resident until something retains it,
    // which is the ordinary state anywhere outside Practice and review.
    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: false,
        model: model('ready'),
        engine: engine({ isReady: false, isWarming: false }),
      }),
    ).toEqual({ kind: 'model-ready' });
  });

  it('reports ready only once the engine is warmed, not merely downloaded', () => {
    // Bytes on disk are not a usable recognizer: `createSTT` plus a warm-up
    // inference sit between them, and that is ~3 s the learner would otherwise
    // spend tapping a live-looking button that does nothing.
    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: false,
        model: model('ready'),
        engine: engine({ isWarming: true }),
      }),
    ).toEqual({ kind: 'preparing', progress: 0.99 });

    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: false,
        model: model('ready'),
        engine: engine({ isReady: true }),
      }),
    ).toEqual({ kind: 'ready' });
  });

  it('passes the download progress straight through while fetching', () => {
    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: false,
        model: model('downloading', { progress: 0.42 }),
        engine: engine({}),
      }),
    ).toEqual({ kind: 'preparing', progress: 0.42 });

    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: false,
        model: model('extracting', { progress: 0.93 }),
        engine: engine({}),
      }),
    ).toEqual({ kind: 'preparing', progress: 0.93 });
  });

  it('surfaces the Wi-Fi wait as its own state, not as a failure', () => {
    // These want opposite treatment: one offers a cellular opt-in, the other
    // has nothing the learner can do from the action band.
    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: false,
        model: model('waiting-wifi'),
        engine: engine({}),
      }),
    ).toEqual({ kind: 'waiting-wifi' });
  });

  it('carries the failure reason so the copy can be actionable', () => {
    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: false,
        model: model('failed', { errorKind: 'disk-space' }),
        engine: engine({}),
      }),
    ).toEqual({ kind: 'failed', reason: 'disk-space' });
  });

  it('ranks a refused microphone above every model state', () => {
    // No amount of downloading fixes a permission, and telling someone to wait
    // when they need to change a setting is the worst available answer.
    expect(
      voiceReadiness({
        voiceEnabled: true,
        micDenied: true,
        model: model('downloading', { progress: 0.5 }),
        engine: engine({}),
      }),
    ).toEqual({ kind: 'mic-denied' });
  });

  it('reports a not-yet-started fetch as pending, never as zero progress', () => {
    // FOUND ON DEVICE. Mapping this to `preparing` rendered "Downloading 0%"
    // right after a manual delete — a percentage quoted for work that had not
    // begun. Surfaces that can afford a neutral label now use one.
    for (const state of ['absent', 'unknown'] as const) {
      expect(
        voiceReadiness({
          voiceEnabled: true,
          micDenied: false,
          model: model(state),
          engine: engine({}),
        }),
      ).toEqual({ kind: 'pending' });
    }
  });
});
