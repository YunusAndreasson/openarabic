/**
 * The prefetch policy hook.
 *
 * Its whole job is deciding when to START, and — just as importantly — never
 * stopping anything. The unmount test below is the guard on that second half.
 */
import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useVoiceModelPrefetch } from '@/hooks/voice/useVoiceModelPrefetch';
import * as voiceModelStore from '@/services/voiceModelStore';

jest.mock('@/services/voiceModelStore', () => ({
  requestVoiceModel: jest.fn(),
  probeVoiceModel: jest.fn(),
}));

describe('useVoiceModelPrefetch', () => {
  const requestVoiceModel = voiceModelStore.requestVoiceModel as unknown as jest.Mock;
  const probeVoiceModel = voiceModelStore.probeVoiceModel as unknown as jest.Mock;

  beforeEach(() => {
    requestVoiceModel.mockResolvedValue({ state: 'ready' });
    probeVoiceModel.mockResolvedValue({ state: 'ready' });
  });

  it('does not fetch while inactive', () => {
    renderHook(() => useVoiceModelPrefetch({ active: false }));
    expect(requestVoiceModel).not.toHaveBeenCalled();
  });

  it('fetches once when it becomes active', () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useVoiceModelPrefetch({ active }),
      { initialProps: { active: false } },
    );

    rerender({ active: true });
    expect(requestVoiceModel).toHaveBeenCalledTimes(1);
    expect(requestVoiceModel).toHaveBeenCalledWith({ reason: 'prefetch' });

    // A re-render with the same value must not re-kick it. The service dedupes
    // anyway, but a hook that fires on every render would hide real bugs.
    rerender({ active: true });
    expect(requestVoiceModel).toHaveBeenCalledTimes(1);
  });

  it('never cancels anything on unmount', () => {
    // THE POINT OF THE WHOLE SPLIT. The previous implementation aborted the
    // download from an effect cleanup, and a sherpa abort both stops the native
    // transfer and deletes its resume record — so an unmount threw away up to
    // 103 MB. There is deliberately no cancel export to call; this asserts the
    // hook has not grown one.
    const { unmount } = renderHook(() => useVoiceModelPrefetch({ active: true }));
    requestVoiceModel.mockClear();

    unmount();

    expect(voiceModelStore).not.toHaveProperty('cancelVoiceModelDownload');
    expect(requestVoiceModel).not.toHaveBeenCalled();
  });

  it('re-probes the disk when the app comes back to the foreground', () => {
    // The transfer is an OS background task and can finish — or, on iOS, finish
    // after the process was killed — while we were away, in which case our
    // in-memory state still says "downloading". A probe is one exists() call.
    // A plain import, not `jest.requireActual`: the latter hands back a separate
    // module instance from the one the hook subscribed on, so the spy sees
    // nothing. Same trap as `jest.requireMock` in the service mocks.
    const addEventListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<
        typeof AppState.addEventListener
      >);

    renderHook(() => useVoiceModelPrefetch({ active: true }));

    const handler = addEventListener.mock.calls.find(([event]) => event === 'change')?.[1];
    expect(handler).toBeDefined();

    probeVoiceModel.mockClear();
    handler?.('active');
    expect(probeVoiceModel).toHaveBeenCalledTimes(1);

    // Backgrounding is not a reason to probe — nothing has changed yet.
    probeVoiceModel.mockClear();
    handler?.('background');
    expect(probeVoiceModel).not.toHaveBeenCalled();
  });
});
