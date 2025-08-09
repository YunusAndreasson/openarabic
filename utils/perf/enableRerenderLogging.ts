/* eslint-disable @typescript-eslint/no-non-null-assertion */
/*
  Dev-only rerender logging using why-did-you-render with AI-friendly JSONL output.
  Writes two files in app sandbox:
  - rerenders.jsonl: one JSON object per render event
  - rerenders.summary.json: rolling summary for quick triage
*/

import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import React from 'react';
import { Platform } from 'react-native';

import { getCurrentRouteInfo } from './routeTracker';

type Change = {
  path: string;
  kind: 'value-change' | 'ref-change-same-value' | 'deep-change' | 'length-change' | 'unknown';
  type: 'number' | 'string' | 'object' | 'array' | 'boolean' | 'null' | 'unknown';
  beforeHash: string;
  afterHash: string;
};

type LogEntry = {
  v: 1;
  ts: number;
  sessionId: string;
  appVersion: string | null;
  commit: string | null;
  device: { os: string; model: string | null; rn: string | null; expo: string | null };
  route: { name: string | null; stackDepth: number | null };
  component: { name: string; ownerPath?: string[]; isMemo?: boolean };
  render: {
    id: number;
    sinceMountMs: number | null;
    reasonType: string | null;
    changes: Change[];
    stateChanged: boolean;
    hooksChanged: string[];
    contextChanged: boolean;
  };
  perf?: { actualDurationMs?: number };
};

const LOG_DIR = `${FileSystem.documentDirectory ?? ''}rerender-logs/`;
const SUMMARY_PATH = `${LOG_DIR}rerenders.summary.json`;
const BUFFER_FLUSH_MS = 2500;
const SUMMARY_FLUSH_EVERY = 50; // update summary after N events
const CONSOLE_ENABLED = true;
const CONSOLE_ONLY = true; // Expo Go: log everything to console, skip file writes
const SESSION_DEFAULT_MS = 3 * 60 * 1000; // 3 minutes session for end-of-run report
const FINAL_REPORT_ONLY = true; // Only print the final report, suppress mid-run logs
const CONSOLE_SUMMARY_INTERVAL_MS = 6000; // tighter feedback loop
const CONSOLE_MAX_COMPONENTS = 3; // more focused

let enabled = false;
let buffer: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let nextRenderId = 1;
let sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Summary aggregation state (kept small)
const summary = {
  metadata: { fromTs: Date.now(), toTs: Date.now(), totalEvents: 0 as number },
  topComponents: new Map<
    string,
    {
      name: string;
      route: string | null;
      renders: number;
      wastedCount: number;
      totalDuration: number;
      propPathCounts: Map<string, { count: number; wasted: number }>;
      catCallbacks?: number;
      catStyles?: number;
      catData?: number;
      catRenderer?: number;
    }
  >(),
};

// Console summary window aggregation
type ConsoleAgg = {
  renders: number;
  wastedCount: number;
  route: string | null;
  propPathCounts: Map<string, number>;
  totalDuration?: number;
  catCallbacks?: number;
  catStyles?: number;
  catData?: number;
  catRenderer?: number;
};
const consoleWindow: Map<string, ConsoleAgg> = new Map();
let consoleFlushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleConsoleFlush(): void {
  if (consoleFlushTimer) return;
  consoleFlushTimer = setTimeout(() => {
    try {
      if (!CONSOLE_ENABLED || consoleWindow.size === 0) {
        consoleFlushTimer = null;
        return;
      }
      const items = Array.from(consoleWindow.entries()).map(([key, v]) => ({
        key,
        name: key.split('@@')[0],
        route: v.route,
        renders: v.renders,
        wasted: v.wastedCount,
        avgMs: (v.totalDuration ?? 0) && v.renders ? (v.totalDuration as number) / v.renders : 0,
        topPaths: Array.from(v.propPathCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([p, c]) => `${p}(${c})`)
          .join(', '),
      }));
      items.sort((a: any, b: any) => b.avgMs - a.avgMs || b.renders - a.renders);
      const top = items.slice(0, CONSOLE_MAX_COMPONENTS);
      // Compact single-line per component; easy to paste
      // Example: [Perf] ReviewCard@/(tabs)/practice avg=12.4ms r=42 w=18 keys=style.container(10),progress(8)
      if (FINAL_REPORT_ONLY) {
        // skip mid-run summaries when final-only mode is active
      } else if (top.length) {
        const lines = top.map(
          (it: any) =>
            `${it.name}@${it.route ?? 'unknown'} avg=${it.avgMs.toFixed(1)}ms r=${it.renders} w=${
              it.wasted
            } keys=${it.topPaths}`
        );
        console.log('[Perf]', lines.join(' | '));
      }
    } catch {
      // ignore console errors
    } finally {
      consoleWindow.clear();
      consoleFlushTimer = null;
    }
  }, CONSOLE_SUMMARY_INTERVAL_MS);
}

function updateConsoleWindow(entry: LogEntry): void {
  const key = `${entry.component.name}@@${entry.route.name ?? 'unknown'}`;
  const agg = consoleWindow.get(key) ?? {
    renders: 0,
    wastedCount: 0,
    route: entry.route.name,
    propPathCounts: new Map<string, number>(),
    totalDuration: 0,
    catCallbacks: 0,
    catStyles: 0,
    catData: 0,
    catRenderer: 0,
  };
  agg.renders += 1;
  const isWasted =
    entry.render.reasonType === 'props' &&
    entry.render.changes.length > 0 &&
    entry.render.changes.every(ch => ch.kind === 'ref-change-same-value');
  if (isWasted) agg.wastedCount += 1;
  for (const ch of entry.render.changes) {
    const p = ch.path || '';
    agg.propPathCounts.set(p, (agg.propPathCounts.get(p) ?? 0) + 1);

    if (/^on[A-Z]/.test(p)) agg.catCallbacks! += 1;
    else if (/style/i.test(p)) agg.catStyles! += 1;
    else if (/(^|\.)renderItem|keyExtractor|getItemLayout/.test(p)) agg.catRenderer! += 1;
    else if (/(^|\.)data|items|list|rows/.test(p)) agg.catData! += 1;
  }
  agg.totalDuration = (agg.totalDuration ?? 0) + (entry.perf?.actualDurationMs ?? 0);
  consoleWindow.set(key, agg);
}

function stableTypeOf(value: unknown): Change['type'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  return (['number', 'string', 'boolean', 'object'].includes(t) ? t : 'unknown') as Change['type'];
}

function hashShort(value: unknown): string {
  const s = JSON.stringify(value, (_k, v) => (typeof v === 'function' ? 'ƒ' : v));
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function mapWhyDiff(d: any): Change {
  const before = d?.prevValue;
  const after = d?.nextValue;
  const sameValue = JSON.stringify(before) === JSON.stringify(after);
  const path = d?.pathString ?? 'unknown';
  const kind: Change['kind'] = sameValue
    ? 'ref-change-same-value'
    : d?.diffType === 'deepEquals'
    ? 'deep-change'
    : d?.diffType === 'different'
    ? 'value-change'
    : d?.diffType === 'length'
    ? 'length-change'
    : 'unknown';
  return {
    path,
    kind,
    type: stableTypeOf(after),
    beforeHash: hashShort(before),
    afterHash: hashShort(after),
  };
}

async function ensureLogDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(LOG_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(LOG_DIR, { intermediates: true });
    }
  } catch {
    // ignore
  }
}

function scheduleFlush(): void {
  if (CONSOLE_ONLY || flushTimer) return;
  flushTimer = setTimeout(async () => {
    const data = buffer.join('\n');
    buffer = [];
    flushTimer = null;
    if (!data) return;
    try {
      await ensureLogDir();
      const fileName = `rerenders-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jsonl`;
      await FileSystem.writeAsStringAsync(`${LOG_DIR}${fileName}`, `${data}\n`, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      // ignore
    }
  }, BUFFER_FLUSH_MS);
}

async function writeSummaryToDisk(): Promise<void> {
  if (CONSOLE_ONLY) return;
  try {
    const items = Array.from(summary.topComponents.values()).map(c => ({
      name: c.name,
      route: c.route,
      renders: c.renders,
      wastedCount: c.wastedCount,
      avgDurationMs: c.renders ? c.totalDuration / c.renders : 0,
      topPropPaths: Array.from(c.propPathCounts.entries())
        .map(([path, v]) => ({ path, count: v.count, wastedCount: v.wasted }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    }));
    const out = {
      metadata: summary.metadata,
      topComponents: items
        .sort((a, b) => b.wastedCount - a.wastedCount || b.renders - a.renders)
        .slice(0, 50),
    };
    await ensureLogDir();
    await FileSystem.writeAsStringAsync(SUMMARY_PATH, JSON.stringify(out), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    // ignore
  }
}

function updateSummary(entry: LogEntry): void {
  summary.metadata.toTs = entry.ts;
  summary.metadata.totalEvents += 1;

  const key = `${entry.component.name}@@${entry.route.name ?? 'unknown'}`;
  let c = summary.topComponents.get(key);
  if (!c) {
    c = {
      name: entry.component.name,
      route: entry.route.name,
      renders: 0,
      wastedCount: 0,
      totalDuration: 0,
      propPathCounts: new Map(),
      catCallbacks: 0,
      catStyles: 0,
      catData: 0,
      catRenderer: 0,
    };
    summary.topComponents.set(key, c);
  }
  c.renders += 1;
  c.totalDuration += entry.perf?.actualDurationMs ?? 0;

  const isWasted =
    entry.render.reasonType === 'props' &&
    entry.render.changes.length > 0 &&
    entry.render.changes.every(ch => ch.kind === 'ref-change-same-value');
  if (isWasted) c.wastedCount += 1;

  for (const ch of entry.render.changes) {
    const pp = c.propPathCounts.get(ch.path) ?? { count: 0, wasted: 0 };
    pp.count += 1;
    if (isWasted) pp.wasted += 1;
    c.propPathCounts.set(ch.path, pp);
    const p = ch.path || '';
    if (/^on[A-Z]/.test(p)) c.catCallbacks! += 1;
    else if (/style/i.test(p)) c.catStyles! += 1;
    else if (/(^|\.)renderItem|keyExtractor|getItemLayout/.test(p)) c.catRenderer! += 1;
    else if (/(^|\.)data|items|list|rows/.test(p)) c.catData! += 1;
  }
}

function printSessionReport(): void {
  try {
    const items = Array.from(summary.topComponents.values()).map(it => {
      const avgMs = it.renders ? it.totalDuration / it.renders : 0;
      const topPaths = Array.from(it.propPathCounts.entries())
        .map(([path, v]) => ({ path, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(x => `${x.path}(${x.count})`)
        .join(', ');
      const suggestions: string[] = [];
      if (
        it.wastedCount / Math.max(1, it.renders) > 0.1 &&
        ((it.catCallbacks ?? 0) > 0 || (it.catStyles ?? 0) > 0)
      ) {
        suggestions.push('memo + memoize callbacks/styles');
      }
      if ((it.catRenderer ?? 0) > 0) suggestions.push('stabilize renderItem/keyExtractor');
      if ((it.catData ?? 0) > 0) suggestions.push('memoize data arrays');
      if (avgMs >= 16 && it.renders >= 10) suggestions.push('split heavy work/useMemo');
      return {
        name: it.name,
        route: it.route,
        avgMs,
        renders: it.renders,
        wasted: it.wastedCount,
        topPaths,
        suggestions,
      };
    });
    items.sort((a, b) => b.avgMs - a.avgMs || b.renders - a.renders);
    const top = items.slice(0, 6);
    if (top.length) {
      console.log(
        '[PerfReport]',
        top
          .map(
            it =>
              `${it.name}@${it.route ?? 'unknown'} avg=${it.avgMs.toFixed(1)}ms r=${it.renders} w=${
                it.wasted
              } keys=${it.topPaths}${
                it.suggestions.length ? ` → Suggest: ${it.suggestions.join('; ')}` : ''
              }`
          )
          .join(' | ')
      );
    }
  } catch {
    // ignore
  }
}

function printEntryToConsole(entry: LogEntry): void {
  try {
    // Only print high-signal events: duration >= 12ms OR wasted=true
    const isWasted =
      entry.render.reasonType === 'props' &&
      entry.render.changes.length > 0 &&
      entry.render.changes.every(ch => ch.kind === 'ref-change-same-value');
    const dur = entry.perf?.actualDurationMs ?? 0;
    if (!isWasted && dur < 12) return;
    if (FINAL_REPORT_ONLY) return;

    const keys = entry.render.changes
      .map(c => c.path)
      .slice(0, 3)
      .join(',');

    console.log(
      '[PerfEvt]',
      `${entry.component.name}@${entry.route.name ?? 'unknown'}`,
      `reason=${entry.render.reasonType ?? 'unknown'}`,
      keys ? `keys=${keys}` : '',
      isWasted ? 'wasted' : '',
      `dur=${dur.toFixed(1)}ms`
    );
  } catch {
    // ignore
  }
}

export function enable(): void {
  if (!__DEV__ || enabled) return;
  enabled = true;

  const reactVersion = String((React as any).version ?? '0');
  const major = parseInt(reactVersion.split('.')[0] || '0', 10);
  const isReact19Plus = Number.isFinite(major) && major >= 19;

  if (!isReact19Plus) {
    try {
      // Dynamically import to satisfy lint rule and keep dev-only without async/await
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Promise.resolve(import('@welldone-software/why-did-you-render')).then((mod: any) => {
        const whyDidYouRender = mod?.default ?? mod;
        whyDidYouRender(React, {
          trackAllPureComponents: true,
          logOnDifferentValues: true,
          collapseComponentGroups: true,
          include: [/./],
          exclude: [
            /^(View|Text|Image|Pressable|ScrollView|FlashList|FlatList|SectionList|VirtualizedList|Animated|Svg)$/i,
            /Provider$/,
            /Connect/,
          ],
          notifier(updateInfo: any) {
            try {
              const route = getCurrentRouteInfo();
              const appVersion = Constants?.expoConfig?.version ?? null;
              const commit = (Constants as any)?.['expoConfigExtra']?.commit ?? null;
              const device = {
                os: Platform.OS,
                model: Constants?.deviceName ?? null,
                rn: (React as any)?.version ?? null,
                expo: (Constants?.expoVersion as string | undefined) ?? null,
              };

              const changes: Change[] = (updateInfo?.reason?.propsDifferences ?? []).map(
                mapWhyDiff
              );
              const hooksChanged: string[] = (updateInfo?.reason?.hookDifferences ?? [])
                .map((d: any) => d?.hookName)
                .filter(Boolean);

              const entry: LogEntry = {
                v: 1,
                ts: Date.now(),
                sessionId,
                appVersion,
                commit,
                device,
                route,
                component: {
                  name: updateInfo?.displayName ?? 'Unknown',
                  ownerPath: updateInfo?.ownerData
                    ?.map?.((o: any) => o?.displayName)
                    .filter(Boolean),
                  isMemo: Boolean(
                    updateInfo?.options?.isPureComponent || updateInfo?.options?.isMemo
                  ),
                },
                render: {
                  id: nextRenderId++,
                  sinceMountMs: updateInfo?.sinceLastRender?.totalTime ?? null,
                  reasonType: updateInfo?.reason?.type ?? null,
                  changes,
                  stateChanged: Boolean(updateInfo?.reason?.stateDifferences?.length),
                  hooksChanged,
                  contextChanged: Boolean(updateInfo?.reason?.contextDifferences?.length),
                },
                perf: { actualDurationMs: updateInfo?.actualDuration },
              } as const;

              if (!CONSOLE_ONLY) {
                buffer.push(JSON.stringify(entry));
                scheduleFlush();
              }
              updateSummary(entry);
              printEntryToConsole(entry);

              if (summary.metadata.totalEvents % SUMMARY_FLUSH_EVERY === 0) {
                void writeSummaryToDisk();
              }
              if (CONSOLE_ENABLED) {
                updateConsoleWindow(entry);
                scheduleConsoleFlush();
              }
            } catch {
              // ignore errors in dev logging
            }
          },
        });
        // Successfully enabled WDYR; set dev helper and return
        // @ts-expect-error dev-only helper
        global.__RERENDER_LOGS__ = {
          dir: LOG_DIR,
          summaryPath: SUMMARY_PATH,
          async clear() {
            try {
              await FileSystem.deleteAsync(LOG_DIR, { idempotent: true });
              await FileSystem.deleteAsync(SUMMARY_PATH, { idempotent: true });
            } catch {
              // ignore
            }
          },
        };
      });
      return;
    } catch {
      // fall through to profiler fallback
    }
  }

  // React 19+ or WDYR failed: install lightweight render tracker wrapper
  // Install lightweight render tracker with strict excludes to avoid navigator children
  installRenderTracker();

  // Print an end-of-session report after ~5 minutes automatically
  setTimeout(() => {
    printSessionReport();
  }, SESSION_DEFAULT_MS);

  // @ts-expect-error dev-only helper
  global.__RERENDER_LOGS__ = {
    dir: LOG_DIR,
    summaryPath: SUMMARY_PATH,
    async clear() {
      try {
        if (!CONSOLE_ONLY) {
          await FileSystem.deleteAsync(LOG_DIR, { idempotent: true });
          await FileSystem.deleteAsync(SUMMARY_PATH, { idempotent: true });
        }
      } catch {
        // ignore
      }
    },
  };
}

export function onProfilerRender(
  id: string,
  _phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number
): void {
  try {
    const route = getCurrentRouteInfo();
    const appVersion = Constants?.expoConfig?.version ?? null;
    const commit = (Constants as any)?.['expoConfigExtra']?.commit ?? null;
    const device = {
      os: Platform.OS,
      model: Constants?.deviceName ?? null,
      rn: (React as any)?.version ?? null,
      expo: (Constants?.expoVersion as string | undefined) ?? null,
    };

    const entry: LogEntry = {
      v: 1,
      ts: Date.now(),
      sessionId,
      appVersion,
      commit,
      device,
      route,
      component: { name: id },
      render: {
        id: nextRenderId++,
        sinceMountMs: null,
        reasonType: 'profiler',
        changes: [],
        stateChanged: false,
        hooksChanged: [],
        contextChanged: false,
      },
      perf: { actualDurationMs: actualDuration },
    } as const;

    if (!CONSOLE_ONLY) {
      buffer.push(JSON.stringify(entry));
      scheduleFlush();
    }
    updateSummary(entry);
    printEntryToConsole(entry);

    if (summary.metadata.totalEvents % SUMMARY_FLUSH_EVERY === 0) {
      void writeSummaryToDisk();
    }
    if (CONSOLE_ENABLED) {
      updateConsoleWindow(entry);
      scheduleConsoleFlush();
    }
  } catch {
    // ignore
  }
}

function installRenderTracker(): void {
  const originalCreateElement = (React as any).createElement;
  const wrappedTypes = new WeakMap<object, any>();

  const EXCLUDE_NAME =
    /^(View|Text|Image|Pressable|ScrollView|FlatList|SectionList|VirtualizedList|Animated|Svg|Gesture|BottomSheet|RCT|RN|Provider|Connect|Stack|Screen|Group|Tabs|Link|NavigationContainer|NativeStackNavigator|NativeStackView|BottomTabNavigator|MaterialTopTabNavigator|Navigator|Route|Slot)$/i;

  function getDisplayName(type: any): string {
    return (
      type?.displayName ||
      type?.name ||
      (type?.type && (type.type.displayName || type.type.name)) ||
      'Anonymous'
    );
  }

  function shallowEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (a[k] !== b[k]) return false;
    }
    return true;
  }

  const REACT_MEMO = Symbol.for('react.memo');
  const REACT_FORWARD_REF = Symbol.for('react.forward_ref');

  function unwrapComponent(orig: any): { base: any; compose: (inner: any) => any } {
    let base = orig;
    const composers: ((inner: any) => any)[] = [];

    // Unwrap memo
    if (base && base.$$typeof === REACT_MEMO && base.type) {
      const prev = base;
      base = prev.type;
      composers.push((inner: any) => (React as any).memo(inner));
    }

    // Unwrap forwardRef
    if (base && base.$$typeof === REACT_FORWARD_REF && base.render) {
      const prev = base;
      const render = prev.render;
      base = function ForwardRefBase(props: any) {
        return render(props, props.ref);
      };
      composers.push((inner: any) =>
        (React as any).forwardRef((p: any, ref: any) =>
          (React as any).createElement(inner, { ...p, ref })
        )
      );
    }

    const compose = (inner: any) => composers.reduceRight((acc, fn) => fn(acc), inner);
    return { base, compose };
  }

  (React as any).createElement = function patchedCreateElement(
    type: any,
    props: any,
    ...children: any[]
  ) {
    try {
      if (
        typeof type === 'string' ||
        type === (React as any).Fragment ||
        type === (React as any).Profiler ||
        type === (React as any).Suspense
      ) {
        return originalCreateElement(type, props, ...children);
      }
      if (type && (typeof type === 'function' || (typeof type === 'object' && type.$$typeof))) {
        const name = getDisplayName(type);
        if (EXCLUDE_NAME.test(name)) {
          return originalCreateElement(type, props, ...children);
        }
        let Wrapped = wrappedTypes.get(type as object);
        if (!Wrapped) {
          const Orig = type;
          const { base, compose } = unwrapComponent(Orig);
          const isClass = !!base?.prototype?.isReactComponent;
          if (isClass || typeof base !== 'function') {
            wrappedTypes.set(type as object, Orig);
            return originalCreateElement(Orig, props, ...children);
          }

          // Use React.forwardRef to avoid breaking ref expectations
          Wrapped = (React as any).forwardRef(function RenderTracked(
            innerProps: any,
            ref: any
          ): any {
            const prevRef = (React as any).useRef(undefined);
            const prev = prevRef.current;
            const reRendered = prev !== undefined;
            const wasted = reRendered && shallowEqual(prev, innerProps);

            if (reRendered) {
              try {
                const route = getCurrentRouteInfo();
                const appVersion = Constants?.expoConfig?.version ?? null;
                const commit = (Constants as any)?.['expoConfigExtra']?.commit ?? null;
                const device = {
                  os: Platform.OS,
                  model: Constants?.deviceName ?? null,
                  rn: (React as any)?.version ?? null,
                  expo: (Constants?.expoVersion as string | undefined) ?? null,
                };

                // Shallow diff keys only to keep console output short
                const changedKeys: string[] = [];
                if (!wasted) {
                  const keys = new Set([
                    ...Object.keys(prev || {}),
                    ...Object.keys(innerProps || {}),
                  ]);
                  for (const k of keys) {
                    if (prev?.[k] !== innerProps?.[k]) changedKeys.push(k);
                  }
                }

                const entry: LogEntry = {
                  v: 1,
                  ts: Date.now(),
                  sessionId,
                  appVersion,
                  commit,
                  device,
                  route,
                  component: { name },
                  render: {
                    id: nextRenderId++,
                    sinceMountMs: null,
                    reasonType: 'props',
                    changes: changedKeys.map(k => ({
                      path: k,
                      kind: 'value-change',
                      type: 'unknown',
                      beforeHash: hashShort(prev?.[k]),
                      afterHash: hashShort(innerProps?.[k]),
                    })),
                    stateChanged: false,
                    hooksChanged: [],
                    contextChanged: false,
                  },
                  perf: {},
                } as const;

                buffer.push(JSON.stringify(entry));
                scheduleFlush();
                updateSummary(entry);
                if (CONSOLE_ENABLED) {
                  updateConsoleWindow(entry);
                  scheduleConsoleFlush();
                }
              } catch {
                // ignore
              }
            }

            (React as any).useEffect(() => {
              prevRef.current = innerProps;
            });

            const TrackedBase = base;
            const Final = compose(TrackedBase);
            return originalCreateElement(Final, { ...innerProps, ref });
          });
          Wrapped.displayName = name;
          wrappedTypes.set(type as object, Wrapped);
        }
        return originalCreateElement(Wrapped, props, ...children);
      }
    } catch {
      // ignore
    }
    return originalCreateElement(type, props, ...children);
  };
}
