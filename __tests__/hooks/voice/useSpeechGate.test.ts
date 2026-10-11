/**
 * The voice-activity gate over react-native-executorch's FSMN detector.
 *
 * The recorder only ever sees the `SpeechGate` contract — `start`, `insert`,
 * `stop`, and a throw when the detector cannot answer — so that contract is
 * what is asserted here, against a stub detector.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  createFsmnVoiceActivityDetector,
  download,
  type FsmnVoiceActivityDetector,
} from 'react-native-executorch';

import { useSpeechGate } from '@/hooks/voice/useSpeechGate';
import { voiceBreadcrumb } from '@/utils/errorHandling';

jest.mock('react-native-executorch', () => ({
  createFsmnVoiceActivityDetector: jest.fn(),
  download: jest.fn(),
  models: { voiceActivityDetection: { FSMN_VAD: { DEFAULT: { modelPath: 'https://model.pte' } } } },
}));
jest.mock('@/utils/errorHandling', () => ({ voiceBreadcrumb: jest.fn() }));
jest.mock('@/utils/reviewDiagnostics', () => ({ mark: jest.fn() }));

const detector = {
  dispose: jest.fn(),
  detectVoice: jest.fn(),
  detectVoiceWorklet: jest.fn(),
  detectVoiceOnStream: jest.fn(),
  resetStream: jest.fn(),
};
const handlers = { onSpeechBegin: jest.fn(), onSpeechEnd: jest.fn() };
const buffer = new Float32Array(1600);

beforeEach(() => {
  jest.mocked(download).mockResolvedValue({ modelPath: '/local/model.pte' });
  jest
    .mocked(createFsmnVoiceActivityDetector)
    .mockResolvedValue(detector as unknown as FsmnVoiceActivityDetector);
});

async function renderLoadedGate() {
  const rendered = renderHook(() => useSpeechGate({ enabled: true }));
  await waitFor(() => expect(rendered.result.current.isReady).toBe(true));
  return rendered;
}

it('fetches nothing while voice is off', () => {
  const { result } = renderHook(() => useSpeechGate({ enabled: false }));

  expect(download).not.toHaveBeenCalled();
  expect(result.current.isReady).toBe(false);
  expect(() => result.current.gate.start(handlers)).toThrow('VAD not loaded');
});

it('downloads the model and builds the detector from the local copy', async () => {
  const { result } = await renderLoadedGate();

  expect(download).toHaveBeenCalledWith(
    { modelPath: 'https://model.pte' },
    { signal: expect.any(AbortSignal) },
  );
  expect(createFsmnVoiceActivityDetector).toHaveBeenCalledWith({ modelPath: '/local/model.pte' });
  expect(result.current.gate.isReady).toBe(true);
});

it('reports speech starting and stopping from the buffers it is fed', async () => {
  const { result } = await renderLoadedGate();
  detector.detectVoiceOnStream
    .mockReturnValueOnce(undefined)
    .mockReturnValueOnce('speechStart')
    .mockReturnValueOnce('speechEnd');

  act(() => result.current.gate.start(handlers));
  // A window always opens on a clean detector, never the last one's audio.
  expect(detector.resetStream).toHaveBeenCalledTimes(1);

  result.current.gate.insert(buffer);
  expect(handlers.onSpeechBegin).not.toHaveBeenCalled();
  result.current.gate.insert(buffer);
  expect(handlers.onSpeechBegin).toHaveBeenCalledTimes(1);
  result.current.gate.insert(buffer);
  expect(handlers.onSpeechEnd).toHaveBeenCalledTimes(1);
  expect(detector.detectVoiceOnStream).toHaveBeenCalledWith(buffer, { detectionMargin: 100 });
});

it('goes quiet once the window is stopped', async () => {
  const { result } = await renderLoadedGate();
  detector.detectVoiceOnStream.mockReturnValue('speechStart');

  act(() => result.current.gate.start(handlers));
  result.current.gate.stop();
  result.current.gate.insert(buffer);

  expect(handlers.onSpeechBegin).not.toHaveBeenCalled();
  expect(detector.resetStream).toHaveBeenCalledTimes(2);
});

it('lets a detector failure through, so the recorder can fall back', async () => {
  const { result } = await renderLoadedGate();
  detector.detectVoiceOnStream.mockImplementation(() => {
    throw new Error('RESOURCE_BUSY');
  });

  act(() => result.current.gate.start(handlers));
  expect(() => result.current.gate.insert(buffer)).toThrow('RESOURCE_BUSY');
});

it('stays on the energy gate, with a breadcrumb, when the model cannot load', async () => {
  jest.mocked(download).mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useSpeechGate({ enabled: true }));

  await waitFor(() =>
    expect(voiceBreadcrumb).toHaveBeenCalledWith(
      'voice.vad.loadFailed',
      { message: 'offline' },
      'warning',
    ),
  );
  expect(result.current.isReady).toBe(false);
});

it('releases the detector when voice is switched off', async () => {
  const { result, rerender } = renderHook(
    (props: { enabled: boolean }) => useSpeechGate({ enabled: props.enabled }),
    { initialProps: { enabled: true } },
  );
  await waitFor(() => expect(result.current.isReady).toBe(true));

  rerender({ enabled: false });

  expect(detector.dispose).toHaveBeenCalledTimes(1);
  expect(result.current.isReady).toBe(false);
  expect(() => result.current.gate.insert(buffer)).toThrow('VAD not loaded');
});

it('disposes a detector that finishes loading after it is no longer wanted', async () => {
  let finish: (value: FsmnVoiceActivityDetector) => void = () => undefined;
  jest.mocked(createFsmnVoiceActivityDetector).mockReturnValue(
    new Promise(resolve => {
      finish = resolve;
    }),
  );
  const { unmount } = renderHook(() => useSpeechGate({ enabled: true }));
  await waitFor(() => expect(createFsmnVoiceActivityDetector).toHaveBeenCalled());

  unmount();
  await act(async () => {
    finish(detector as unknown as FsmnVoiceActivityDetector);
    await Promise.resolve();
  });

  expect(detector.dispose).toHaveBeenCalledTimes(1);
});
