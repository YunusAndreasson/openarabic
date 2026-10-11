import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createSTT, type SttEngine } from 'react-native-sherpa-onnx/stt';

import { createEngineWithTimeout, useParakeetStt } from '@/hooks/voice/useSherpaStt';
import { prepareHotwordFiles } from '@/services/voiceHotwordFiles';
import { voiceBreadcrumb } from '@/utils/errorHandling';

jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/voiceHotwordFiles', () => ({ prepareHotwordFiles: jest.fn() }));
jest.mock('@/utils/errorHandling', () => ({ voiceBreadcrumb: jest.fn() }));
jest.mock('@/utils/reviewDiagnostics', () => ({ span: () => () => undefined }));

describe('createEngineWithTimeout', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('fails a native engine build that never settles', async () => {
    jest.useFakeTimers();
    const pending = createEngineWithTimeout(() => new Promise(() => undefined), 1_000);

    jest.advanceTimersByTime(1_000);

    await expect(pending).rejects.toThrow('Voice engine did not load within 1 seconds');
  });

  it('destroys an engine that arrives after the timeout', async () => {
    jest.useFakeTimers();
    let resolveEngine: (engine: SttEngine) => void = () => {};
    const destroy = jest.fn().mockResolvedValue(undefined);
    const pending = createEngineWithTimeout(
      () =>
        new Promise(resolve => {
          resolveEngine = resolve;
        }),
      1_000,
    );

    jest.advanceTimersByTime(1_000);
    await expect(pending).rejects.toThrow();
    resolveEngine({ destroy } as unknown as SttEngine);
    await Promise.resolve();
    await Promise.resolve();

    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

describe('useParakeetStt', () => {
  const HOTWORD_OPTIONS = {
    modelingUnit: 'bpe' as const,
    bpeVocab: '/cache/bpe.vocab',
    hotwordsFile: '/cache/hotwords.txt',
    hotwordsScore: 1,
  };
  /** Every native call in the order it happened — the thing these tests are about. */
  let events: string[];
  let built: number;

  function makeEngine(name: string): SttEngine {
    return {
      destroy: jest.fn(() => {
        events.push(`destroy ${name}`);
        return Promise.resolve();
      }),
      transcribeSamples: jest.fn(() => Promise.resolve({ text: ` ${name} ` })),
    } as unknown as SttEngine;
  }

  function renderStt(hotwords = '') {
    return renderHook(
      (props: { hotwords: string }) =>
        useParakeetStt({ retained: true, modelPath: '/model', hotwords: props.hotwords }),
      { initialProps: { hotwords } },
    );
  }

  beforeEach(() => {
    events = [];
    built = 0;
    jest.mocked(prepareHotwordFiles).mockResolvedValue(HOTWORD_OPTIONS);
    jest.mocked(createSTT).mockImplementation(() => {
      built += 1;
      const name = `engine${built}`;
      events.push(`create ${name}`);
      return Promise.resolve(makeEngine(name));
    });
  });

  it('builds an unbiased engine when there is no vocabulary', async () => {
    const { result } = renderStt();

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(prepareHotwordFiles).not.toHaveBeenCalled();
    expect(createSTT).toHaveBeenCalledWith({
      modelPath: { type: 'file', path: '/model' },
      modelType: 'nemo_transducer',
      numThreads: 2,
    });
    expect(result.current.hotwordCount).toBe(0);
    await expect(result.current.transcribe(new Float32Array(4))).resolves.toBe('engine1');
  });

  it('builds the engine from the hotword files when there is one', async () => {
    const { result } = renderStt('book\nhouse\n');

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(prepareHotwordFiles).toHaveBeenCalledWith('/model', 'book\nhouse\n');
    expect(createSTT).toHaveBeenCalledWith(expect.objectContaining(HOTWORD_OPTIONS));
    expect(result.current.hotwordCount).toBe(2);
  });

  it('destroys the old engine before building one for a new vocabulary', async () => {
    const { result, rerender } = renderStt();
    await waitFor(() => expect(result.current.isReady).toBe(true));

    rerender({ hotwords: 'book\nhouse\n' });
    // Not ready on the old engine's word while the new one is being built.
    expect(result.current.isReady).toBe(false);
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(events).toEqual(['create engine1', 'destroy engine1', 'create engine2']);
    expect(result.current.hotwordCount).toBe(2);
  });

  it('never holds two engines when a build is superseded mid-flight', async () => {
    let finishFirst: (engine: SttEngine) => void = () => undefined;
    jest.mocked(createSTT).mockImplementationOnce(() => {
      events.push('create engine1');
      return new Promise<SttEngine>(resolve => {
        finishFirst = resolve;
      });
    });
    const { result, rerender } = renderStt();
    await waitFor(() => expect(events).toEqual(['create engine1']));

    // The session's vocabulary arrives while the unbiased build is still running.
    rerender({ hotwords: 'book\nhouse\n' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(createSTT).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishFirst(makeEngine('engine1'));
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(events).toEqual(['create engine1', 'destroy engine1', 'create engine1']);
    expect(result.current.hotwordCount).toBe(2);
  });

  it('falls back to an unbiased engine when the hotwords cannot be prepared', async () => {
    jest.mocked(prepareHotwordFiles).mockRejectedValue(new Error('no tokens.txt'));
    const { result } = renderStt('book\nhouse\n');

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(createSTT).toHaveBeenCalledTimes(1);
    expect(createSTT).toHaveBeenCalledWith(
      expect.not.objectContaining({ hotwordsFile: expect.anything() }),
    );
    expect(result.current.hotwordCount).toBe(0);
    expect(voiceBreadcrumb).toHaveBeenCalledWith(
      'voice.hotwords.failed',
      { message: 'no tokens.txt' },
      'warning',
    );
  });

  it('falls back to an unbiased engine when the recogniser refuses the hotwords', async () => {
    jest
      .mocked(createSTT)
      .mockImplementationOnce(() => Promise.reject(new Error('HOTWORDS_NOT_SUPPORTED')));
    const { result } = renderStt('book\nhouse\n');

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(createSTT).toHaveBeenCalledTimes(2);
    expect(result.current.hotwordCount).toBe(0);
  });

  it('does not start a second build behind one that hung', async () => {
    jest.useFakeTimers();
    jest.mocked(createSTT).mockImplementation(() => new Promise(() => undefined));
    const { result } = renderStt('book\nhouse\n');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(45_000);
    });

    expect(result.current.error?.message).toContain('did not load within 45 seconds');
    expect(result.current.isReady).toBe(false);
    expect(createSTT).toHaveBeenCalledTimes(1);
  });

  it('destroys the engine when nothing retains it any more', async () => {
    const { result, unmount } = renderStt();
    await waitFor(() => expect(result.current.isReady).toBe(true));

    unmount();
    await waitFor(() => expect(events).toEqual(['create engine1', 'destroy engine1']));
  });
});
