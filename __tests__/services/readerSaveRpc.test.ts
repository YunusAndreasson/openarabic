import { beforeEach, expect, jest, test } from '@jest/globals';
import { rootId } from '@/__tests__/helpers/ids';
import { readerSaveReceipt } from '@/services/readerSaveRpc';
import { checkAuthentication, supabase } from '@/services/supabase';

jest.mock('@/services/supabase', () => ({
  supabase: { rpc: jest.fn() },
  checkAuthentication: jest.fn(),
}));
const rpc = supabase.rpc as unknown as jest.Mock<
  (name: string, args: unknown) => Promise<{ data: unknown; error: { code: string } | null }>
>;
beforeEach(() => {
  jest
    .mocked(checkAuthentication)
    .mockResolvedValue({ session: { access_token: 'checked-session' } } as Awaited<
      ReturnType<typeof checkAuthentication>
    >);
});
const probe = () => readerSaveReceipt('owner', rootId(7), 'intent', false);

test.each(['PGRST202', '42883'])(
  'a missing save RPC (%s) permits the legacy owner-scoped add',
  async code => {
    const missing = { data: null, error: { code } };
    const oldRpc = Object.assign(Promise.resolve(missing), {
      setHeader: jest.fn((_name: string, _value: string) => Promise.resolve(missing)),
    });
    rpc.mockResolvedValueOnce(missing).mockReturnValueOnce(oldRpc);
    await expect(probe()).resolves.toBe('legacy');
  },
);
test('an ambiguous response keeps the original intent and never permits a legacy write', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { code: '504' } });
  await expect(probe()).rejects.toEqual({ code: '504' });
  expect(rpc).toHaveBeenCalledWith('save_reader_word', {
    p_expected_owner: 'owner',
    p_root: 7,
    p_insert: false,
    p_intent: 'intent',
  });
});
test('an owner mismatch stops before receipt lookup', async () => {
  jest.mocked(checkAuthentication).mockRejectedValueOnce(new Error('owner changed'));
  await expect(probe()).rejects.toThrow('owner changed');
  expect(rpc).not.toHaveBeenCalled();
});

test.each([false, true])(
  'a session switch between validation and RPC rejects the journal (insert=%s)',
  async insert => {
    let activeAccount = 'owner';
    jest.mocked(checkAuthentication).mockImplementationOnce(async expected => {
      expect(expected).toBe(activeAccount);
      const checked = {
        session: { user: { id: activeAccount }, access_token: 'original-session' },
      };
      activeAccount = 'next-account';
      return checked as Awaited<ReturnType<typeof checkAuthentication>>;
    });
    const writes: string[] = [];
    rpc.mockImplementationOnce(async (_name, args) => {
      const expected = (args as { p_expected_owner?: string }).p_expected_owner;
      if (expected && expected !== activeAccount) return { data: null, error: { code: '42501' } };
      if (insert) writes.push(activeAccount);
      return { data: { outcome: insert ? 'saved' : 'missing' }, error: null };
    });
    await expect(readerSaveReceipt('owner', rootId(7), 'intent', insert)).rejects.toMatchObject({
      code: '42501',
    });
    expect(writes).toHaveLength(0);
  },
);

test('while only the deployed receipt RPC exists, a switched SDK session cannot change its bearer', async () => {
  const saved = { data: { outcome: 'saved' }, error: null };
  const oldRpc = Object.assign(Promise.resolve(saved), {
    setHeader: jest.fn((_name: string, _value: string) => Promise.resolve(saved)),
  });
  rpc
    .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
    .mockReturnValueOnce(oldRpc);
  await expect(readerSaveReceipt('owner', rootId(7), 'intent', true)).resolves.toBe('saved');
  expect(oldRpc.setHeader).toHaveBeenCalledWith('Authorization', 'Bearer checked-session');
});
