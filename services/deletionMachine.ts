import { toError } from '@/utils/toError';

// Idle is represented by the absence of a record. All other phases are
// checkpointed with the owner before their side effect runs.
export type DeletionPhase = 'idle' | 'requested' | 'confirmed' | 'teardown';
type Event =
  | 'dispatch'
  | 'rpcOk'
  | 'rpcLost'
  | 'rpcError'
  | 'sessionValid'
  | 'sessionMissing'
  | 'sessionSwitched'
  | 'sessionExpired'
  | 'restart'
  | 'retry'
  | 'startCleanup'
  | 'cleaned'
  | 'transient';
type Action =
  | 'none'
  | 'send'
  | 'reconcile'
  | 'resend'
  | 'checkOwner'
  | 'endSession'
  | 'failure'
  | 'retryable'
  | 'done';

export function deletionTransition(
  phase: DeletionPhase,
  event: Event,
): readonly [DeletionPhase, Action] {
  switch (event) {
    case 'dispatch':
      if (phase === 'idle') return ['requested', 'send'];
      break;
    case 'rpcOk':
      if (phase === 'requested') return ['confirmed', 'checkOwner'];
      break;
    case 'rpcLost':
      if (phase === 'requested') return ['requested', 'retryable'];
      break;
    case 'rpcError':
    case 'sessionValid': // Verified by the auth server during reconciliation.
      if (phase === 'requested') return ['idle', 'failure'];
      break;
    case 'sessionMissing':
    case 'sessionExpired':
      if (phase === 'idle') return ['idle', 'failure'];
      if (phase === 'requested') return ['confirmed', 'checkOwner'];
      return ['teardown', 'endSession'];
    case 'sessionSwitched':
      return ['idle', phase === 'confirmed' || phase === 'teardown' ? 'done' : 'failure'];
    case 'restart':
    case 'retry':
      if (phase === 'requested') return [phase, event === 'retry' ? 'resend' : 'reconcile'];
      if (phase !== 'idle') return [phase, 'checkOwner'];
      break;
    case 'startCleanup':
      if (phase === 'confirmed' || phase === 'teardown') return ['teardown', 'endSession'];
      break;
    case 'cleaned':
      if (phase === 'teardown') return ['idle', 'done'];
      break;
    case 'transient':
      return [phase, phase === 'idle' ? 'failure' : 'retryable'];
  }
  return [phase, 'none'];
}

export interface DeletionIO {
  // A local token can authorize a resend. Only getUser proves survival.
  session(
    owner: string,
  ): Promise<{ token: string } | 'sessionMissing' | 'sessionExpired' | 'sessionSwitched'>;
  identity(owner: string): Promise<'sessionValid' | 'sessionExpired' | 'sessionSwitched'>;
  prepare(owner: string): Promise<void>;
  send(
    owner: string,
    token: string,
  ): Promise<{ event: 'rpcOk' } | { event: 'rpcLost' | 'rpcError'; error: Error }>;
}

export async function runDeletion(
  owner: string,
  initial: DeletionPhase,
  intent: 'begin' | 'restart' | 'retry',
  io: DeletionIO,
  persist: (phase: DeletionPhase) => Promise<void>,
  clearLocal: () => Promise<void>,
  finish: () => Promise<void>,
  remote: <T>(read: () => Promise<T>) => Promise<T | 'sessionSwitched'>,
) {
  let phase = initial;
  let token = '';
  let cause: Error | undefined;
  // The request record also journals a local obligation. Start it immediately
  // on replay, or alongside the first send. Never discard the record until
  // the OS and storage have acknowledged it, even when the server refuses.
  async function sweep() {
    try {
      await clearLocal();
      return undefined;
    } catch (error) {
      return toError(error);
    }
  }
  let local = initial === 'idle' ? undefined : sweep();
  let finalSweep: Promise<void> | undefined;
  async function drainLocal() {
    if (!local) return;
    const error = await local;
    if (error) throw error;
    // Drain writes and deliveries which landed while the RPC was outstanding,
    // before releasing the journal or handing the device to another account.
    finalSweep ??= clearLocal();
    await finalSweep;
  }
  async function inspect(): Promise<Event | undefined> {
    const session = await remote(() => io.session(owner));
    if (typeof session === 'string') return session;
    token = session.token;
    return undefined;
  }

  async function prepare(): Promise<Event> {
    const session = await inspect();
    if (session) return session;
    const identity = await remote(() => io.identity(owner));
    if (identity !== 'sessionValid') return identity;
    if ((await remote(() => io.prepare(owner))) === 'sessionSwitched') return 'sessionSwitched';
    return (await inspect()) ?? 'dispatch';
  }
  async function send(): Promise<Event> {
    try {
      const response = remote(() => io.send(owner, token));
      local ??= sweep();
      const result = await response;
      if (result === 'sessionSwitched') return result;
      if ('error' in result) cause = result.error;
      return result.event;
    } catch (error) {
      cause = toError(error);
      return 'rpcLost';
    }
  }

  let event: Event;
  if (phase === 'idle' && intent === 'begin') event = await prepare();
  // Only an explicit Retry resends. Reopening deletion after authenticating is
  // another opportunity to verify whether the earlier request took effect.
  else event = intent === 'retry' ? 'retry' : 'restart';

  for (;;) {
    const [next, action] = deletionTransition(phase, event);
    if (next !== phase) {
      if (next === 'idle') await drainLocal();
      try {
        await persist(next);
      } finally {
        // A failed journal write must not release the actor's queue while
        // local cleanup is still operating on the shared device.
        await local;
      }
      phase = next;
    }
    if (action === 'failure' || action === 'retryable') {
      await drainLocal();
      throw cause ?? new Error('Account deletion could not be confirmed');
    }
    try {
      switch (action) {
        case 'none':
        case 'done':
          return;
        case 'reconcile':
          event = (await inspect()) ?? (await remote(() => io.identity(owner)));
          break;
        case 'resend':
          event = (await inspect()) ?? (await send());
          break;
        case 'send':
          event = await send();
          break;
        case 'checkOwner':
          event = (await inspect()) ?? 'startCleanup';
          break;
        case 'endSession':
          await drainLocal();
          await finish();
          event = 'cleaned';
          break;
      }
    } catch (error) {
      cause = toError(error);
      event = 'transient';
    }
  }
}
