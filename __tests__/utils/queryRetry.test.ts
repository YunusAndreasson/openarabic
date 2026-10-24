jest.unmock('@tanstack/react-query');

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { onlineManager, QueryClient } from '@tanstack/react-query';

import { createPostgrestErrorMock } from '@/__tests__/helpers/serviceMocks';
import { isRetryableError, retryWhileOnline } from '@/utils/queryRetry';
import { SupabaseRequestError } from '@/utils/supabaseHelpers';

jest.mock('@/services/supabase', () => ({ checkAuthentication: jest.fn() }));
jest.mock('@/utils/errorHandling', () => ({ handleError: jest.fn() }));

const requestError = (status: number) =>
  new SupabaseRequestError(createPostgrestErrorMock(`status ${status}`), status);

describe('isRetryableError', () => {
  test.each([400, 403, 404, 406, 409, 422])('a %i cannot succeed on a second attempt', status => {
    expect(isRetryableError(requestError(status))).toBe(false);
  });

  test.each([401, 408, 429])('a %i is worth another attempt', status => {
    expect(isRetryableError(requestError(status))).toBe(true);
  });

  test.each([0, 500, 503, 520])('a %i (no response, or a server error) is retried', status => {
    expect(isRetryableError(requestError(status))).toBe(true);
  });

  test('reads the status off any error that carries one, not only PostgREST', () => {
    expect(isRetryableError(Object.assign(new Error('auth'), { status: 400 }))).toBe(false);
  });

  test('an error without a status is retried', () => {
    expect(isRetryableError(new Error('Network request failed'))).toBe(true);
  });
});

describe('retryWhileOnline', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  test('retries a retryable failure up to the limit', () => {
    const retry = retryWhileOnline(2);
    const error = requestError(503);

    expect(retry(0, error)).toBe(true);
    expect(retry(1, error)).toBe(true);
    expect(retry(2, error)).toBe(false);
  });

  test('never retries a client error', () => {
    expect(retryWhileOnline(3)(0, requestError(403))).toBe(false);
  });

  test('never retries while offline', () => {
    onlineManager.setOnline(false);

    expect(retryWhileOnline(3)(0, requestError(0))).toBe(false);
  });

  // The splash bug: under a bare number the retryer sleeps, then pauses for
  // as long as the device is offline, so an awaited fetch never settles.
  // Under this policy the same offline failure rejects on the first attempt.
  test('lets an awaited offline query reject instead of pausing', async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    const queryFn = jest.fn(() => Promise.reject(requestError(0)));

    await expect(
      client.query({
        queryKey: ['offline-probe'],
        queryFn,
        networkMode: 'offlineFirst',
        retry: retryWhileOnline(3),
      }),
    ).rejects.toBeInstanceOf(SupabaseRequestError);

    expect(queryFn).toHaveBeenCalledTimes(1);
    client.clear();
  });

  test('a bare retry count leaves the same offline query paused, never settled', async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    const settled = jest.fn();

    void client
      .query({
        queryKey: ['offline-probe-numeric'],
        queryFn: () => Promise.reject(requestError(0)),
        networkMode: 'offlineFirst',
        retry: 3,
        retryDelay: 0,
      })
      .then(settled, settled);

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(settled).not.toHaveBeenCalled();
    expect(client.getQueryState(['offline-probe-numeric'])?.fetchStatus).toBe('paused');
    client.clear();
  });
});
