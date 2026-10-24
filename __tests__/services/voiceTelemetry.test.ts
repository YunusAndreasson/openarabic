/**
 * The voice_grading_attempts row: one per resolved attempt, built from what the
 * recorder measured, what the matcher decided and how the arm got there.
 */
import { VOICE_DECODING_METHOD, VOICE_HOTWORD_DECODING_METHOD } from '@/constants/voiceModel';
import { DEFAULT_RECORDING_CONFIG, type RecordingResult } from '@/lib/voice/recording';
import { supabase } from '@/services/supabase';
import {
  buildVoiceAttemptLog,
  logVoiceArmFailure,
  type VoiceAttemptInput,
} from '@/services/voiceTelemetry';
import type { ArmStages } from '@/utils/armTelemetry';
import { matchSingleWord } from '@/utils/voiceMatching';

jest.mock('@/services/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));
jest.mock('@/utils/errorHandling', () => ({ voiceBreadcrumb: jest.fn() }));

const recording: RecordingResult = {
  gateUsed: 'vad',
  waveform: new Float32Array(1600),
  sampleRate: 16000,
  durationMs: 1200,
  heardSpeech: true,
  peakRms: 0.04,
  noiseFloorDb: -57.6,
  speechMs: 600,
  levelsDb: [-60, -30, -58],
  bufferCount: 12,
  stopReason: 'silence',
  firstBufferMs: 40,
  stopDecidedAtMs: 1180,
};

const armStages = { tapToArmMs: 12 } as unknown as ArmStages;

const input = (overrides: Partial<VoiceAttemptInput> = {}): VoiceAttemptInput => ({
  rootId: null,
  transcript: 'Books.',
  match: matchSingleWord({ spoken: 'Books.', expected: 'book' }),
  suggestion: null,
  attemptIndex: 2,
  recording,
  tapToCapturingMs: 310,
  armAttempts: 1,
  armTrigger: 'tap',
  answerDisclosed: false,
  armStages,
  prompt: null,
  settings: {
    energyGateEnabled: true,
    gainNormalizeEnabled: false,
    iosRawMode: false,
    debugEnabled: false,
  },
  hotwordCount: 0,
  ...overrides,
});

describe('buildVoiceAttemptLog', () => {
  it('takes the columns from the match and the recording', () => {
    expect(buildVoiceAttemptLog(input())).toEqual(
      expect.objectContaining({
        expected: 'book',
        transcript: 'Books.',
        normalizedSpoken: 'books',
        matched: true,
        matchMethod: 'inflection',
        similarity: 1,
        suggestion: null,
        attemptIndex: 2,
        durationMs: 1200,
        stopReason: 'silence',
        heardSpeech: true,
        peakRms: 0.04,
        bufferCount: 12,
        firstBufferMs: 40,
        stopDecidedAtMs: 1180,
      }),
    );
  });

  it('records which gate decided and rounds the room, without the audio', () => {
    const { meta } = buildVoiceAttemptLog(input());
    expect(meta['gate']).toEqual({
      used: 'vad',
      noiseFloorDb: -58,
      speechMs: 600,
      levelsDb: [-60, -30, -58],
    });
    expect(JSON.stringify(meta)).not.toContain('waveform');
  });

  it('keeps a dead microphone distinguishable from a quiet room', () => {
    const { meta } = buildVoiceAttemptLog(
      input({ recording: { ...recording, noiseFloorDb: null, bufferCount: 0 } }),
    );
    expect(meta['gate']).toEqual(expect.objectContaining({ noiseFloorDb: null }));
  });

  it('snapshots the effective recording config from the toggles', () => {
    const { meta } = buildVoiceAttemptLog(input());
    expect(meta['recordingConfig']).toEqual({
      ...DEFAULT_RECORDING_CONFIG,
      energyGateEnabled: true,
      gainNormalizeEnabled: false,
      iosRawMode: false,
    });
  });

  it('names the decoder by whether the engine carried hotwords', () => {
    expect(buildVoiceAttemptLog(input()).meta['decoding']).toEqual({
      method: VOICE_DECODING_METHOD,
      hotwords: 0,
    });
    expect(buildVoiceAttemptLog(input({ hotwordCount: 40 })).meta['decoding']).toEqual({
      method: VOICE_HOTWORD_DECODING_METHOD,
      hotwords: 40,
    });
  });

  it('carries how the arm got there', () => {
    expect(buildVoiceAttemptLog(input()).meta).toEqual(
      expect.objectContaining({
        tapToCapturingMs: 310,
        armAttempts: 1,
        armTrigger: 'tap',
        answerDisclosed: false,
        armStages,
        streamRefreshed: false,
        prompt: null,
      }),
    );
  });
});

describe('logVoiceArmFailure', () => {
  it('writes the window columns as nothing measured, by default', async () => {
    const insert = jest.fn(async (..._args: unknown[]) => ({ error: null }));
    jest.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    } as never);
    jest.mocked(supabase.from).mockReturnValue({ insert } as never);

    await logVoiceArmFailure({
      rootId: null,
      expected: 'book',
      attemptIndex: 3,
      reason: 'error',
      message: 'input stream unavailable',
      meta: { phase: 'gave-up' },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: 'arm_failed',
        duration_ms: null,
        stop_reason: null,
        buffer_count: null,
        attempt_index: 3,
        meta: {
          phase: 'gave-up',
          armReason: 'error',
          armMessage: 'input stream unavailable',
          tapToCapturingMs: null,
          streamRefreshed: false,
        },
      }),
    );
  });
});
