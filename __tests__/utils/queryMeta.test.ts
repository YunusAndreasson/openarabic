/**
 * reportQueryFailure — the query and mutation caches' `onError`.
 *
 * Failures used to be reported from inside the queryFn, so a query retried
 * three times reported four times: four toasts, four Sentry events, four
 * analytics events for one failure.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { MutationCache, MutationObserver, QueryCache, QueryClient } from '@tanstack/react-query';

import { createPostgrestErrorMock } from '@/__tests__/helpers/serviceMocks';
import { handleError } from '@/utils/errorHandling';
import { reportQueryFailure } from '@/utils/queryMeta';
import { executeQuery, managedRequest, SupabaseRequestError } from '@/utils/supabaseHelpers';

jest.mock('@/utils/errorHandling', () => ({ handleError: jest.fn() }));
jest.mock('@/services/supabase', () => ({ checkAuthentication: jest.fn() }));

const handleErrorMock = jest.mocked(handleError);
const REPORT = {
  toastMessage: "Couldn't load articles",
  analyticsEventName: 'Articles_Load_Error',
};

const pendingFailure = () =>
  new SupabaseRequestError(createPostgrestErrorMock('boom'), 503, REPORT);

/** A client wired the way app/_layout.tsx wires the app's. */
const createReportingClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => reportQueryFailure(error, query.meta),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) =>
        reportQueryFailure(error, mutation.meta),
    }),
  });

/** What a managed queryFn's service call throws: PostgREST's failure, report deferred. */
const failingManagedRequest = () =>
  executeQuery(
    async () => ({
      data: null,
      error: createPostgrestErrorMock('boom'),
      count: null,
      status: 503,
      statusText: '',
      success: false as const,
    }),
    REPORT,
    managedRequest(),
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reportQueryFailure', () => {
  test("reports a managed request's deferred report", () => {
    const error = pendingFailure();

    reportQueryFailure(error, undefined);

    expect(handleErrorMock).toHaveBeenCalledWith(error, REPORT);
  });

  // The reading list fails inside the audio tracks' queryFn too: one failure,
  // surfacing through two queries, is still one report.
  test('reports the same failure once, whichever query it surfaces through', () => {
    const error = pendingFailure();

    reportQueryFailure(error, undefined);
    reportQueryFailure(error, undefined);

    expect(handleErrorMock).toHaveBeenCalledTimes(1);
  });

  test('a silent query reports nothing', () => {
    reportQueryFailure(pendingFailure(), { silent: true });

    expect(handleErrorMock).not.toHaveBeenCalled();
  });

  test("falls back to the query's own errorReport for a failure without one", () => {
    const report = { analyticsEventName: 'Enhanced_Audio_Playlist_Error', showToast: false };
    const error = new Error('track building failed');

    reportQueryFailure(error, { errorReport: report });

    expect(handleErrorMock).toHaveBeenCalledWith(error, report);
  });

  // A direct call already reported where it threw.
  test('ignores a failure with nothing pending and no errorReport', () => {
    reportQueryFailure(new Error('already reported'), undefined);

    expect(handleErrorMock).not.toHaveBeenCalled();
  });
});

describe('through the caches', () => {
  test('a query that fails three times reports once, after the last retry', async () => {
    const client = createReportingClient();
    const queryFn = jest.fn(failingManagedRequest);

    await expect(
      client.query({ queryKey: ['articles'], queryFn, retry: 2, retryDelay: 0 }),
    ).rejects.toBeInstanceOf(SupabaseRequestError);

    expect(queryFn).toHaveBeenCalledTimes(3);
    expect(handleErrorMock).toHaveBeenCalledTimes(1);
    expect(handleErrorMock).toHaveBeenCalledWith(expect.any(SupabaseRequestError), REPORT);
    client.clear();
  });

  test('a mutation that fails three times reports once, after the last retry', async () => {
    const client = createReportingClient();
    const mutationFn = jest.fn(failingManagedRequest);
    const observer = new MutationObserver(client, { mutationFn, retry: 2, retryDelay: 0 });

    await expect(observer.mutate()).rejects.toBeInstanceOf(SupabaseRequestError);

    expect(mutationFn).toHaveBeenCalledTimes(3);
    expect(handleErrorMock).toHaveBeenCalledTimes(1);
    client.clear();
  });

  test('a silent query stays silent through the cache', async () => {
    const client = createReportingClient();

    await expect(
      client.query({
        queryKey: ['review', 'examples', '1'],
        queryFn: failingManagedRequest,
        retry: false,
        meta: { silent: true },
      }),
    ).rejects.toBeDefined();

    expect(handleErrorMock).not.toHaveBeenCalled();
    client.clear();
  });
});
