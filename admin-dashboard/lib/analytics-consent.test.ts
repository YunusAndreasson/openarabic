import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_CONSENT_KEY,
  analyticsBootstrapScript,
  readAnalyticsChoice,
  saveAnalyticsChoice,
  stopAnalytics,
} from './analytics-consent';

const GA_ID = 'G-TEST';

/** Runs the real inline script against a fake page and reports what it did. */
function runBootstrap(stored: string | null | 'throws') {
  const appended: { src: string }[] = [];
  const dataLayer: unknown[][] = [];
  const context: Record<string, unknown> = {
    dataLayer,
    localStorage: {
      getItem: () => {
        if (stored === 'throws') throw new Error('blocked');
        return stored;
      },
    },
    document: {
      getElementById: () => null,
      createElement: () => ({}),
      head: { appendChild: (s: { src: string }) => appended.push(s) },
    },
  };
  context.window = context;
  vm.runInNewContext(analyticsBootstrapScript(GA_ID), context);
  const calls = () => dataLayer.map((args) => Array.from(args as unknown as ArrayLike<unknown>));
  return { appended, calls, start: context.oaStartAnalytics as () => void };
}

const configCalls = (calls: unknown[][]) => calls.filter((c) => c[0] === 'config');

describe('analyticsBootstrapScript', () => {
  it.each([null, 'denied', 'nonsense', 'throws'] as const)(
    'loads nothing from Google when the stored choice is %s',
    (stored) => {
      const { appended, calls } = runBootstrap(stored);
      expect(appended).toHaveLength(0);
      expect(configCalls(calls())).toHaveLength(0);
    },
  );

  it('denies every consent type by default', () => {
    const { calls } = runBootstrap(null);
    expect(calls()[0]).toEqual([
      'consent',
      'default',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);
  });

  it('loads gtag.js for a returning visitor who agreed, and grants analytics only', () => {
    const { appended, calls } = runBootstrap('granted');
    expect(appended[0].src).toBe(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    expect(calls()).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    expect(JSON.stringify(calls().filter((c) => c[1] === 'update'))).not.toContain('ad_');
    expect(configCalls(calls())[0][2]).toEqual({
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  });

  it('starts on demand when someone agrees during the visit', () => {
    const { appended, calls, start } = runBootstrap(null);
    start();
    expect(appended).toHaveLength(1);
    expect(configCalls(calls())).toHaveLength(1);
  });
});

describe('stored choice', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubWindow = (storage: Partial<Storage>) =>
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: () => true,
    });

  it('treats a blocked read as no choice', () => {
    stubWindow({
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readAnalyticsChoice()).toBeNull();
  });

  it('keeps the choice for the visit when storage is blocked', () => {
    stubWindow({
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
    });
    saveAnalyticsChoice('denied');
    expect(readAnalyticsChoice()).toBe('denied');
  });

  it('reads a stored choice under the shared key', () => {
    const getItem = vi.fn(() => 'granted');
    stubWindow({ getItem });
    expect(readAnalyticsChoice()).toBe('granted');
    expect(getItem).toHaveBeenCalledWith(ANALYTICS_CONSENT_KEY);
  });
});

describe('stopAnalytics', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('disables GA, denies storage and removes analytics cookies on every domain level', () => {
    const written: string[] = [];
    const gtag = vi.fn();
    const fakeWindow: Record<string, unknown> = {
      gtag,
      location: { hostname: 'www.openarabic.io' },
    };
    vi.stubGlobal('window', fakeWindow);
    vi.stubGlobal('document', {
      get cookie() {
        return '_ga=1; _ga_ABC=2; sb-auth=keep; _gid=3';
      },
      set cookie(value: string) {
        written.push(value);
      },
    });

    stopAnalytics(GA_ID);

    expect(fakeWindow[`ga-disable-${GA_ID}`]).toBe(true);
    expect(gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
    expect(written).toContain('_ga=; Max-Age=0; path=/');
    expect(written).toContain('_ga=; Max-Age=0; path=/; domain=openarabic.io');
    expect(written).toContain('_ga_ABC=; Max-Age=0; path=/; domain=www.openarabic.io');
    expect(written.some((c) => c.startsWith('sb-auth'))).toBe(false);
  });
});
