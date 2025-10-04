/*
 Dev-only logger for Review/FSRS sessions.
 Emits detailed console logs to troubleshoot sessions ending too early/late.
 In production builds this is a no-op.
*/

import { getEnvVar } from '@/utils/env';

type Primitive = string | number | boolean | null | undefined;

interface LogContext {
  sessionId: string;
  userId?: string | null;
  mode?: string | null;
  sessionCooldownHours?: number;
}

interface StartSessionParams {
  userId?: string | null;
  mode?: string;
  sessionCooldownHours?: number;
  dueCount?: number;
  signature?: string | null;
}

const isDev: boolean =
  typeof __DEV__ !== 'undefined' ? __DEV__ === true : getEnvVar('NODE_ENV') !== 'production';

let currentContext: LogContext | null = null;
let startTimestamp: number | null = null;

function generateSessionId(): string {
  return `rev-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function safeSerialize(obj: unknown): unknown {
  // Avoid crashing on circular structures; shallow clone primitives and plain objects/arrays
  try {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj as Primitive;
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return '[Unserializable]';
  }
}

function baseLog(
  level: 'log' | 'warn' | 'error',
  event: string,
  data?: Record<string, unknown>
): void {
  if (!isDev) return;
  const ts = new Date().toISOString();
  const ctx = currentContext ?? { sessionId: 'rev-unknown' };
  const serialized = safeSerialize(data);
  const spreadable =
    serialized && typeof serialized === 'object' && !Array.isArray(serialized)
      ? (serialized as Record<string, unknown>)
      : {};
  const payload = {
    ts,
    event,
    ...ctx,
    ...spreadable,
    ...(spreadable === serialized ? {} : data ? { _data: serialized } : {}),
  } as Record<string, unknown>;

  console[level]('[review]', payload);
}

export const devReviewLogger = {
  startSession(params: StartSessionParams = {}): void {
    if (!isDev) return;
    currentContext = {
      sessionId: generateSessionId(),
      userId: params.userId ?? null,
      mode: params.mode ?? null,
      sessionCooldownHours: params.sessionCooldownHours,
    };
    startTimestamp = Date.now();
    baseLog('log', 'session.start', {
      dueCount: params.dueCount,
      signature: params.signature,
    });
  },

  ensureStarted(params?: StartSessionParams): void {
    if (!isDev) return;
    if (!currentContext) this.startSession(params);
  },

  log(event: string, data?: Record<string, unknown>): void {
    baseLog('log', event, data);
  },

  warn(event: string, data?: Record<string, unknown>): void {
    baseLog('warn', event, data);
  },

  error(event: string, data?: Record<string, unknown>): void {
    baseLog('error', event, data);
  },

  endSession(
    outcome: 'completed' | 'closed' | 'unmounted' | 'aborted',
    data?: Record<string, unknown>
  ): void {
    if (!isDev) return;
    const durationMs = startTimestamp ? Date.now() - startTimestamp : undefined;
    baseLog('log', 'session.end', { outcome, durationMs, ...(data ?? {}) });
    currentContext = null;
    startTimestamp = null;
  },
};

export type DevReviewLogger = typeof devReviewLogger;
