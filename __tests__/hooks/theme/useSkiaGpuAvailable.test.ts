import { AppState, type AppStateStatus } from 'react-native';

/**
 * The hook keeps module state (the last reading, and whether a loss was
 * reported), so each test loads a fresh copy of it and of the Skia mock. React
 * and the renderer come from the same isolated registry, so the hook and the
 * renderer share one React. (RNTL cannot be loaded here: importing it registers
 * lifecycle hooks, which Jest refuses inside a test.)
 */
const load = (isAvailable: boolean) => {
  let changeListener: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    changeListener = listener as (state: AppStateStatus) => void;
    return { remove };
  });

  let hook!: typeof import('@/hooks/theme/useSkiaGpuAvailable');
  let skia!: typeof import('react-native-skia');
  let sentry!: typeof import('@sentry/react-native');
  let React!: typeof import('react');
  let renderer!: typeof import('react-test-renderer');
  jest.isolateModules(() => {
    React = require('react');
    renderer = require('react-test-renderer');
    skia = require('react-native-skia');
    sentry = require('@sentry/react-native');
    hook = require('@/hooks/theme/useSkiaGpuAvailable');
  });
  const gpu = skia.Skia.gpu as { isAvailable: boolean };
  gpu.isAvailable = isAvailable;

  /** Mounts a reader of the hook; `current()` is its latest value. */
  const mount = () => {
    let value: boolean | undefined;
    const Reader = () => {
      value = hook.useSkiaGpuAvailable();
      return null;
    };
    let root!: ReturnType<typeof renderer.create>;
    renderer.act(() => {
      root = renderer.create(React.createElement(Reader));
    });
    return {
      current: () => value,
      unmount: () => renderer.act(() => root.unmount()),
    };
  };

  return {
    hook,
    sentry,
    mount,
    setAvailable: (next: boolean) => {
      gpu.isAvailable = next;
    },
    foreground: () => renderer.act(() => changeListener?.('active')),
    remove,
  };
};

describe('useSkiaGpuAvailable', () => {
  test('reports the GPU Skia found', () => {
    const { mount } = load(true);

    expect(mount().current()).toBe(true);
  });

  test('picks up a GPU lost while the app was in the background, and reports it once', () => {
    const { sentry, mount, setAvailable, foreground } = load(true);
    const reader = mount();

    setAvailable(false);
    foreground();
    foreground();

    expect(reader.current()).toBe(false);
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  test('stops listening once nothing reads it', () => {
    const { mount, remove } = load(true);
    const first = mount();
    const second = mount();

    first.unmount();
    expect(remove).not.toHaveBeenCalled();

    second.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('names the adapter for Sentry', () => {
    const { hook } = load(true);

    expect(hook.getSkiaGpuContext()).toEqual(
      expect.objectContaining({ isAvailable: true, backend: 'Metal' }),
    );
  });
});
