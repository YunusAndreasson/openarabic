/**
 * The voice model download service.
 *
 * Every test here corresponds to a way the previous implementation lost a
 * ~103 MB download or lied to the learner about why it had not arrived.
 */
import {
  createNetInfoStateMock,
  installNetInfoMock,
  installSherpaMocks,
} from '../helpers/serviceMocks';

import {
  __resetVoiceModelStoreForTests,
  allowMeteredVoiceModelDownload,
  deleteVoiceModel,
  getVoiceModelSnapshot,
  probeVoiceModel,
  requestVoiceModel,
  retryVoiceModel,
  subscribeVoiceModel,
} from '@/services/voiceModelStore';

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn().mockResolvedValue(undefined) },
}));

describe('voiceModelStore', () => {
  let sherpa: ReturnType<typeof installSherpaMocks>;
  let net: ReturnType<typeof installNetInfoMock>;

  beforeEach(() => {
    // Implementations must be armed per test: `resetMocks: true` wipes anything
    // the manual mocks set at module scope.
    sherpa = installSherpaMocks();
    net = installNetInfoMock(createNetInfoStateMock(true));
    __resetVoiceModelStoreForTests();
  });

  describe('deduping concurrent requests', () => {
    it('runs one fetch for two concurrent callers', async () => {
      // The library does NOT dedupe: two ensureModelByCategory calls for the
      // same id both write the same state file and both create a download task
      // with the same id, where the second silently overwrites the first.
      // Prefetch and session-start race easily, so the service has to.
      let release: (value: { localPath: string }) => void = () => {};
      sherpa.download.ensureModelByCategory.mockReturnValue(
        new Promise<{ localPath: string }>(resolve => {
          release = resolve;
        }),
      );

      const first = requestVoiceModel({ reason: 'prefetch' });
      const second = requestVoiceModel({ reason: 'session' });

      await Promise.resolve();
      release({ localPath: '/mock/model/path' });
      const [a, b] = await Promise.all([first, second]);

      expect(sherpa.download.ensureModelByCategory).toHaveBeenCalledTimes(1);
      expect(a.state).toBe('ready');
      expect(b.state).toBe('ready');
    });

    it('short-circuits once the model is ready', async () => {
      sherpa.download.isModelDownloadedByCategory.mockResolvedValue(true);
      await requestVoiceModel({ reason: 'prefetch' });
      sherpa.download.ensureModelByCategory.mockClear();

      await requestVoiceModel({ reason: 'session' });
      expect(sherpa.download.ensureModelByCategory).not.toHaveBeenCalled();
    });
  });

  describe('the no-abort invariant', () => {
    it('never passes an AbortSignal to the library', async () => {
      // STRUCTURAL ON PURPOSE. Aborting a sherpa download calls task.stop() AND
      // unlinks the resume state file, so a signal wired to a React lifecycle
      // throws away up to 103 MB whenever a component unmounts. That is the
      // exact bug this service exists to remove; this test is the guard against
      // someone reintroducing it.
      await requestVoiceModel({ reason: 'prefetch' });

      const options = sherpa.download.ensureModelByCategory.mock.calls[0]?.[2] as
        Record<string, unknown> | undefined;
      expect(options).toBeDefined();
      expect(options).not.toHaveProperty('signal');
    });
  });

  describe('the Wi-Fi gate', () => {
    it('defers on cellular and does not touch the library', async () => {
      net = installNetInfoMock(createNetInfoStateMock(true, { type: 'cellular' }));

      const snapshot = await requestVoiceModel({ reason: 'prefetch' });

      expect(snapshot.state).toBe('waiting-wifi');
      expect(sherpa.download.ensureModelByCategory).not.toHaveBeenCalled();
    });

    it('treats a metered Wi-Fi hotspot as cellular', async () => {
      // An iOS Personal Hotspot reports type 'wifi' while costing cellular
      // data, so `type` alone is not the question.
      net = installNetInfoMock(createNetInfoStateMock(true, { isConnectionExpensive: true }));

      const snapshot = await requestVoiceModel({ reason: 'prefetch' });

      expect(snapshot.state).toBe('waiting-wifi');
      expect(sherpa.download.ensureModelByCategory).not.toHaveBeenCalled();
    });

    it('defers when offline', async () => {
      net = installNetInfoMock(createNetInfoStateMock(false));

      const snapshot = await requestVoiceModel({ reason: 'prefetch' });

      expect(snapshot.state).toBe('waiting-wifi');
    });

    it('starts as soon as Wi-Fi appears, without waiting for a relaunch', async () => {
      net = installNetInfoMock(createNetInfoStateMock(true, { type: 'cellular' }));
      await requestVoiceModel({ reason: 'prefetch' });
      expect(sherpa.download.ensureModelByCategory).not.toHaveBeenCalled();

      net.transitionTo(createNetInfoStateMock(true));
      await new Promise(process.nextTick);

      expect(sherpa.download.ensureModelByCategory).toHaveBeenCalledTimes(1);
      expect(getVoiceModelSnapshot().state).toBe('ready');
    });

    it('downloads immediately on cellular once the learner opts in', async () => {
      net = installNetInfoMock(createNetInfoStateMock(true, { type: 'cellular' }));
      await requestVoiceModel({ reason: 'prefetch' });

      const snapshot = await allowMeteredVoiceModelDownload();

      expect(sherpa.download.ensureModelByCategory).toHaveBeenCalledTimes(1);
      expect(snapshot.state).toBe('ready');
    });
  });

  describe('error classification', () => {
    it('reports a full disk as disk-space and does not auto-retry on Wi-Fi', async () => {
      // "Try again later" was the old message, and it is advice that can never
      // work: waiting frees nothing. Retrying on every connection change would
      // also burn battery against a failure that cannot succeed.
      sherpa.download.ensureModelByCategory.mockRejectedValue(
        new Error('Insufficient disk space. Available: 0.05GB, Required: 0.12GB'),
      );

      const snapshot = await requestVoiceModel({ reason: 'prefetch' });
      expect(snapshot.state).toBe('failed');
      expect(snapshot.errorKind).toBe('disk-space');

      sherpa.download.ensureModelByCategory.mockClear();
      net.emit(createNetInfoStateMock(true));
      await new Promise(process.nextTick);
      expect(sherpa.download.ensureModelByCategory).not.toHaveBeenCalled();
    });

    it('classifies a transport failure as network and retries when Wi-Fi returns', async () => {
      sherpa.download.ensureModelByCategory.mockRejectedValueOnce(
        new Error('Network request failed'),
      );

      const snapshot = await requestVoiceModel({ reason: 'prefetch' });
      expect(snapshot.state).toBe('failed');
      expect(snapshot.errorKind).toBe('network');

      sherpa.download.ensureModelByCategory.mockResolvedValue({ localPath: '/mock/model/path' });
      net.emit(createNetInfoStateMock(true));
      await new Promise(process.nextTick);

      expect(getVoiceModelSnapshot().state).toBe('ready');
    });

    it('retries after an explicit retry even when a full disk blocked it', async () => {
      sherpa.download.ensureModelByCategory.mockRejectedValueOnce(
        new Error('Insufficient disk space. Available: 0.05GB, Required: 0.12GB'),
      );
      await requestVoiceModel({ reason: 'prefetch' });

      sherpa.download.ensureModelByCategory.mockResolvedValue({ localPath: '/mock/model/path' });
      const snapshot = await retryVoiceModel();

      expect(snapshot.state).toBe('ready');
    });
  });

  describe('the first-ever fetch', () => {
    it('refreshes the registry and retries once on "Unknown model id"', async () => {
      // The registry is read from an on-disk cache that a fresh install has
      // never populated, so the FIRST fetch always reads a valid id as unknown.
      sherpa.download.ensureModelByCategory
        .mockRejectedValueOnce(new Error('Unknown model id: sherpa-onnx-nemo-parakeet'))
        .mockResolvedValueOnce({ localPath: '/mock/model/path' });

      const snapshot = await requestVoiceModel({ reason: 'prefetch' });

      expect(sherpa.download.refreshModelsByCategory).toHaveBeenCalledTimes(1);
      expect(sherpa.download.ensureModelByCategory).toHaveBeenCalledTimes(2);
      expect(snapshot.state).toBe('ready');
    });

    it('does not refresh the registry for an unrelated failure', async () => {
      sherpa.download.ensureModelByCategory.mockRejectedValue(new Error('Network request failed'));

      await requestVoiceModel({ reason: 'prefetch' });

      expect(sherpa.download.refreshModelsByCategory).not.toHaveBeenCalled();
    });
  });

  describe('progress reporting', () => {
    it('never goes backwards across the download/extract phase change', async () => {
      // The library counts 0→100 for the download and then 0→100 again for the
      // extract. Mapping both onto one bar made it visibly reset, which reads as
      // a failure mid-session even though nothing is wrong.
      const seen: number[] = [];
      subscribeVoiceModel(() => {
        seen.push(getVoiceModelSnapshot().progress);
      });

      sherpa.download.ensureModelByCategory.mockImplementation(
        async (
          _category: string,
          _id: string,
          options: { onProgress?: (p: { percent: number; phase: string }) => void },
        ) => {
          options.onProgress?.({ percent: 40, phase: 'downloading' });
          options.onProgress?.({ percent: 95, phase: 'downloading' });
          options.onProgress?.({ percent: 2, phase: 'extracting' });
          options.onProgress?.({ percent: 60, phase: 'extracting' });
          return { localPath: '/mock/model/path' };
        },
      );

      await requestVoiceModel({ reason: 'prefetch' });

      const monotonic = seen.every((value, i) => i === 0 || value >= (seen[i - 1] ?? 0));
      expect(monotonic).toBe(true);
      expect(getVoiceModelSnapshot().progress).toBe(1);
    });

    it('puts the extract phase above the download phase', async () => {
      sherpa.download.ensureModelByCategory.mockImplementation(
        async (
          _category: string,
          _id: string,
          options: { onProgress?: (p: { percent: number; phase: string }) => void },
        ) => {
          options.onProgress?.({ percent: 100, phase: 'downloading' });
          const afterDownload = getVoiceModelSnapshot().progress;
          options.onProgress?.({ percent: 1, phase: 'extracting' });
          expect(getVoiceModelSnapshot().progress).toBeGreaterThanOrEqual(afterDownload);
          return { localPath: '/mock/model/path' };
        },
      );

      await requestVoiceModel({ reason: 'prefetch' });
    });
  });

  describe('snapshot identity', () => {
    it('returns the same reference when nothing has changed', () => {
      // A fresh object per call would spin useSyncExternalStore forever.
      expect(getVoiceModelSnapshot()).toBe(getVoiceModelSnapshot());
    });

    it('returns a new reference after a change', async () => {
      const before = getVoiceModelSnapshot();
      await requestVoiceModel({ reason: 'prefetch' });
      expect(getVoiceModelSnapshot()).not.toBe(before);
    });
  });

  describe('probe and delete', () => {
    it('reports ready from disk without downloading anything', async () => {
      sherpa.download.isModelDownloadedByCategory.mockResolvedValue(true);

      const snapshot = await probeVoiceModel();

      expect(snapshot.state).toBe('ready');
      expect(snapshot.localPath).toBe('/mock/model/path');
      expect(sherpa.download.ensureModelByCategory).not.toHaveBeenCalled();
    });

    it('leaves the state unknown when the probe itself throws', async () => {
      // A failed probe means "still unknown", not "failed" — only the fetch path
      // may declare a failure, because only it has a reason worth showing.
      sherpa.download.isModelDownloadedByCategory.mockRejectedValue(new Error('fs exploded'));

      const snapshot = await probeVoiceModel();

      expect(snapshot.state).toBe('unknown');
    });

    it('drops back to absent after a delete', async () => {
      sherpa.download.isModelDownloadedByCategory.mockResolvedValue(true);
      await probeVoiceModel();
      expect(getVoiceModelSnapshot().state).toBe('ready');

      await deleteVoiceModel();

      expect(sherpa.download.deleteModelByCategory).toHaveBeenCalledTimes(1);
      expect(getVoiceModelSnapshot()).toMatchObject({ state: 'absent', localPath: null });
    });
  });
});
