import type { SttEngine } from 'react-native-sherpa-onnx/stt';

import { createEngineWithTimeout } from '@/hooks/voice/useSherpaStt';

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
