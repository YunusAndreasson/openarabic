import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { describe, expect, jest, test } from '@jest/globals';

import { isKnownOffline } from '@/utils/network';

const mockFetch = jest.mocked(NetInfo.fetch);

const withConnection = (isConnected: boolean | null) =>
  ({ isConnected }) as unknown as NetInfoState;

describe('isKnownOffline', () => {
  test('true only for a definitive isConnected === false', async () => {
    mockFetch.mockResolvedValueOnce(withConnection(false));
    await expect(isKnownOffline()).resolves.toBe(true);
  });

  test('connected is not offline', async () => {
    mockFetch.mockResolvedValueOnce(withConnection(true));
    await expect(isKnownOffline()).resolves.toBe(false);
  });

  test('null means unknown, which is not offline', async () => {
    mockFetch.mockResolvedValueOnce(withConnection(null));
    await expect(isKnownOffline()).resolves.toBe(false);
  });

  test('a NetInfo failure fails open', async () => {
    mockFetch.mockRejectedValueOnce(new Error('native module missing'));
    await expect(isKnownOffline()).resolves.toBe(false);
  });
});
