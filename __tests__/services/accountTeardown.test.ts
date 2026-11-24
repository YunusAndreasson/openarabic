import { expect, jest, test } from '@jest/globals';
import { createAccountTeardown } from '@/services/accountTeardown';

const deletion = {
  session: async () => ({ token: 'token' }),
  identity: async () => 'sessionValid' as const,
  prepare: async () => {},
  send: async () => ({ event: 'rpcOk' as const }),
};

test.each(['generation', 'notifications', 'widget', 'storage', 'finish'] as const)(
  'cold startup replays an interrupted %s step before publishing UI',
  async kill => {
    const disk = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => disk.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        disk.set(key, value);
      },
      removeItem: async (key: string) => {
        disk.delete(key);
      },
    };
    const surfaces = {
      oldGeneration: true,
      pending: true,
      delivered: true,
      personalWidget: true,
      privateStorage: true,
      session: true,
    };
    let interrupted = false;
    const after = (step: string) => {
      if (!interrupted && step === kill) {
        interrupted = true;
        throw new Error('process stopped after durable side effect');
      }
    };
    const steps = {
      revokeWidgetGeneration: () => {
        surfaces.oldGeneration = false;
        after('generation');
      },
      notifications: jest.fn(async () => {
        expect(surfaces.oldGeneration).toBe(false);
        surfaces.pending = false;
        surfaces.delivered = false;
        after('notifications');
      }),
      widget: jest.fn(async () => {
        expect(surfaces.pending || surfaces.delivered).toBe(false);
        surfaces.personalWidget = false;
        after('widget');
      }),
      storage: jest.fn(async () => {
        expect(surfaces.personalWidget).toBe(false);
        surfaces.privateStorage = false;
        after('storage');
      }),
      finish: jest.fn(async () => {
        expect(surfaces.privateStorage).toBe(false);
        surfaces.session = false;
        after('finish');
      }),
    };
    const first = createAccountTeardown(storage, steps, deletion);
    await expect(first.begin('owner', 'signOut')).rejects.toThrow('process stopped');
    expect(disk.size).toBe(1);
    const cold = createAccountTeardown(storage, steps, deletion);
    expect(cold.snapshot()).toBe('checking');
    await cold.resume();
    expect(cold.snapshot()).toBe('ready');
    expect(Object.values(surfaces)).not.toContain(true);
    expect(disk.size).toBe(0);
    await cold.resume();
    expect(disk.size).toBe(0);
  },
);

test('a kill after the delete acknowledgement replays only the local session ending', async () => {
  const disk = new Map<string, string>();
  const storage = {
    getItem: async (k: string) => disk.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      disk.set(k, v);
    },
    removeItem: async (k: string) => {
      disk.delete(k);
    },
  };
  const removeRemote = jest.fn();
  let crash = true;
  const noop = async () => {};
  const steps = {
    revokeWidgetGeneration: () => undefined,
    notifications: noop,
    widget: noop,
    storage: noop,
    finish: async () => {
      if (crash) {
        crash = false;
        throw new Error('killed before local signout');
      }
    },
  };
  const io = {
    ...deletion,
    send: async () => {
      removeRemote();
      return { event: 'rpcOk' as const };
    },
  };
  await expect(createAccountTeardown(storage, steps, io).begin('owner', 'delete')).rejects.toThrow(
    'killed',
  );
  await createAccountTeardown(storage, steps, io).resume();
  expect(removeRemote).toHaveBeenCalledTimes(1);
  expect(disk.size).toBe(0);
});

test.each(['null', 'false', ''])(
  'a malformed durable cleanup record never releases the reader (%j)',
  async raw => {
    const disk = {
      getItem: async () => raw,
      setItem: async () => {},
      removeItem: jest.fn(async () => {}),
    };
    const noop = async () => {};
    const lifecycle = createAccountTeardown(
      disk,
      {
        revokeWidgetGeneration: () => undefined,
        notifications: noop,
        widget: noop,
        storage: noop,
        finish: noop,
      },
      deletion,
    );
    await expect(lifecycle.resume()).rejects.toThrow();
    expect(lifecycle.snapshot()).toBe('failed');
    expect(disk.removeItem).not.toHaveBeenCalled();
  },
);

test.each(['running', 'journaled'])(
  'a %s expired-session teardown cannot acknowledge an unsent deletion',
  async state => {
    const noop = async () => {};
    const disk = {
      getItem: async () =>
        state === 'journaled' ? JSON.stringify({ owner: 'owner', mode: 'expired' }) : null,
      setItem: noop,
      removeItem: noop,
    };
    const lifecycle = createAccountTeardown(
      disk,
      {
        revokeWidgetGeneration: () => undefined,
        notifications: noop,
        widget: noop,
        storage: noop,
        finish: noop,
      },
      deletion,
    );
    const expired = state === 'running' ? lifecycle.begin('owner', 'expired') : undefined;
    await expect(lifecycle.begin('owner', 'delete')).rejects.toThrow();
    await expired;
  },
);

test('a failed confirmation checkpoint cannot release a replacement ahead of an older local sweep', async () => {
  let raw: string | null = null;
  const failed = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const noop = async () => {};
  let oldWriterRunning = false;
  const controller = createAccountTeardown(
    {
      getItem: async () => raw,
      setItem: async (_key, value) => {
        if (JSON.parse(value).phase === 'confirmed') {
          failed.resolve();
          throw new Error('checkpoint unavailable');
        }
        raw = value;
      },
      removeItem: async () => {
        raw = null;
      },
    },
    {
      revokeWidgetGeneration: () => undefined,
      notifications: jest
        .fn<() => Promise<void>>()
        .mockImplementationOnce(async () => {
          oldWriterRunning = true;
          await release.promise;
          oldWriterRunning = false;
        })
        .mockImplementation(noop),
      widget: noop,
      storage: noop,
      finish: noop,
    },
    deletion,
  );
  const request = controller.begin('old', 'delete').catch(() => undefined);
  await failed.promise;
  const observed: boolean[] = [];
  const replacement = controller.acceptSession('new', true).then(accepted => {
    if (accepted) observed.push(oldWriterRunning);
  });
  // Let all unblocked actor and admission continuations run with the old
  // local write still outstanding. A new session cannot publish in this gap.
  await new Promise<void>(resolve => setImmediate(resolve));
  release.resolve();
  await Promise.all([request, replacement]);
  expect(observed).toEqual([false]);
  expect(raw).toBeNull();
});
