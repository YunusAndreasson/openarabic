import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { createSerialQueue } from '@/utils/createSerialQueue';
import { runDeletion, type DeletionIO, type DeletionPhase } from './deletionMachine';

type Job =
  | { owner: string; mode: 'signOut' | 'expired' }
  | { owner: string; mode: 'delete'; phase: DeletionPhase };
type Mode = Job['mode'];
type Step = (owner: string, mode: Mode) => Promise<void>;
type Status =
  | 'checking'
  | 'running'
  | 'failed'
  | 'ready'
  | 'deletionPending'
  | 'deletionRetry'
  | 'deletionFailed';
const key = STORAGE_KEYS.ACCOUNT_TEARDOWN;

function readJob(raw: string): Job {
  const row = JSON.parse(raw) as Partial<
    Record<'owner' | 'mode' | 'phase' | 'deletionRequested' | 'serverDeleted', unknown>
  > | null;
  if (typeof row?.owner !== 'string' || !row.owner)
    throw new Error('Invalid account cleanup record');
  const { owner, mode, phase } = row;
  if (mode === 'signOut' || mode === 'expired') return { owner, mode };
  if (mode === 'delete') {
    if (phase === 'requested' || phase === 'confirmed' || phase === 'teardown')
      return { owner, mode, phase };
    if (phase === undefined) {
      // Migrate the old flags. An intent without a request never went to the server.
      return {
        owner,
        mode,
        phase:
          row.serverDeleted === true
            ? 'confirmed'
            : row.deletionRequested === true
              ? 'requested'
              : 'idle',
      };
    }
  }
  throw new Error('Invalid account cleanup record');
}

export async function teardownPending() {
  return (await AsyncStorage.getItem(key)) != null;
}

export function createAccountTeardown(
  disk: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>,
  steps: Record<'notifications' | 'widget' | 'storage' | 'finish', Step> & {
    revokeWidgetGeneration: (owner: string) => void;
  },
  deletion: DeletionIO,
) {
  const queue = createSerialQueue();
  let status: Status = 'checking';
  let unrecorded: Job | undefined;
  let active: { owner: string; mode: Mode; operation: Promise<void> } | undefined;
  let recovery: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  function set(next: Status) {
    status = next;
    listeners.forEach(fn => fn());
  }
  async function clearLocal({ owner, mode }: Job) {
    steps.revokeWidgetGeneration(owner);
    await steps.notifications(owner, mode);
    await steps.widget(owner, mode);
    await steps.storage(owner, mode);
  }
  async function discard(job: Extract<Job, { mode: 'delete' }>) {
    try {
      if (job.phase !== 'idle') await clearLocal(job);
      await disk.removeItem(key);
    } catch (error) {
      set('deletionRetry');
      throw error;
    }
  }

  // Account mutations remain serialized. Only network waits may detach. The
  // loser of a race can finish its HTTP request, but cannot advance the journal,
  // sign out a new session, or publish anything to the device.
  const admissions = new Set<{ owner: string }>();
  let waiting: { owner: string; switchAccount: () => void } | undefined;
  async function withOwner<T>(
    owner: string,
    work: (remote: <V>(read: () => Promise<V>) => Promise<V | 'sessionSwitched'>) => Promise<T>,
  ) {
    const replacement = Promise.withResolvers<'sessionSwitched'>();
    let switched = false;
    function switchAccount() {
      switched = true;
      replacement.resolve('sessionSwitched');
    }
    waiting = { owner, switchAccount };
    if (Array.from(admissions).some(incoming => incoming.owner !== owner)) switchAccount();
    try {
      return await work(async read =>
        switched ? 'sessionSwitched' : Promise.race([replacement.promise, read()]),
      );
    } finally {
      waiting = undefined;
    }
  }
  async function perform(request?: Job, retry = false) {
    let deleting = request?.mode === 'delete';
    let phase: DeletionPhase = 'idle';
    try {
      const raw = await disk.getItem(key);
      let stored = raw != null ? readJob(raw) : undefined;
      if (
        stored?.mode === 'delete' &&
        request &&
        request.owner !== stored.owner &&
        (await deletion.session(stored.owner)) === 'sessionSwitched'
      ) {
        deleting = true;
        phase = stored.phase;
        await discard(stored);
        stored = undefined;
      }
      const job = stored ?? unrecorded ?? request;
      if (job) {
        deleting = job.mode === 'delete';
        if (job.mode === 'delete') phase = job.phase;
        if (
          request &&
          (request.owner !== job.owner || (request.mode === 'delete' && job.mode !== 'delete'))
        )
          throw new Error('Account cleanup in progress');
        // Once public routes have opened, keep them mounted throughout a resend.
        if (!(job.mode === 'delete' && retry && status === 'deletionRetry')) set('running');
        if (job.mode === 'delete') {
          if (stored && job.phase === 'idle') {
            await disk.removeItem(key);
            throw new Error('Account deletion was never requested');
          }
          await withOwner(job.owner, remote =>
            runDeletion(
              job.owner,
              job.phase,
              request?.mode === 'delete' ? 'begin' : retry ? 'retry' : 'restart',
              deletion,
              async next => {
                if (next === 'idle') await disk.removeItem(key);
                else {
                  try {
                    await disk.setItem(key, JSON.stringify({ ...job, phase: next }));
                  } catch (error) {
                    // No RPC has run if the write-ahead checkpoint failed.
                    if (phase === 'idle') await disk.removeItem(key);
                    throw error;
                  }
                }
                phase = next;
              },
              async () => {
                await clearLocal(job);
                // Auth can now mount as guest and observe a sign-in while the
                // original HTTP request is still outstanding.
                if (status === 'running' && phase === 'requested') set('deletionPending');
              },
              () => steps.finish(job.owner, job.mode),
              remote,
            ),
          );
        } else {
          if (!stored) {
            unrecorded = job;
            await disk.setItem(key, JSON.stringify(job));
          }
          unrecorded = undefined;
          await clearLocal(job);
          await steps.finish(job.owner, job.mode);
          await disk.removeItem(key);
        }
      }
      set('ready');
    } catch (error) {
      // Only sign-out's unfinished privacy sweep owns a blocking Retry screen.
      // Deletion errors share the public navigator, including while offline.
      set(deleting ? (phase === 'idle' ? 'deletionFailed' : 'deletionRetry') : 'failed');
      throw error;
    }
  }
  function recover(retry: boolean) {
    if (active) return active.operation;
    recovery ??= queue(() => perform(undefined, retry)).finally(() => {
      recovery = undefined;
    });
    return recovery;
  }
  return {
    begin(owner: string, mode: Mode) {
      if (active?.owner === owner) {
        if (mode === 'delete' && active.mode !== 'delete')
          return Promise.reject(new Error('Account cleanup in progress'));
        return active.operation;
      }
      const job: Job = mode === 'delete' ? { owner, mode, phase: 'idle' } : { owner, mode };
      const operation = queue(() => perform(job)).finally(() => {
        if (active?.operation === operation) active = undefined;
      });
      active = { owner, mode, operation };
      return operation;
    },
    resume: () => recover(false),
    retry: () => recover(true),
    dismissFailure: () => {
      if (status === 'deletionFailed') set('ready');
    },
    acceptSession(owner: string, signedIn: boolean) {
      if (waiting?.owner === owner && !signedIn) return Promise.resolve(false);
      const incoming = { owner };
      admissions.add(incoming);
      if (waiting && waiting.owner !== owner) waiting.switchAccount();
      return queue(async () => {
        const raw = await disk.getItem(key);
        if (raw == null) return true;
        const job = readJob(raw);
        if (job.mode !== 'delete') return false;
        if (job.owner !== owner || job.phase === 'idle') {
          await discard(job);
          set('ready');
          return true;
        }
        if (
          signedIn &&
          job.phase === 'requested' &&
          (await withOwner(owner, remote => remote(() => deletion.identity(owner)))) ===
            'sessionValid'
        ) {
          await discard(job);
          set('deletionFailed');
          return true;
        }
        return false;
      }).finally(() => {
        admissions.delete(incoming);
      });
    },
    snapshot: () => status,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
