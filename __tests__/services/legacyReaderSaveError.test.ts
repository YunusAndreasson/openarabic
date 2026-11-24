import { expect, jest, test } from '@jest/globals';
import { waitFor } from '@testing-library/react-native';
import { supabase } from '@/services/supabase';
import { analytics } from '@/services/analytics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { reportQueryFailure } from '@/utils/queryMeta';
import { managedRequest } from '@/utils/supabaseHelpers';
import { rootId } from '@/__tests__/helpers/ids';
jest.mock('@/services/supabase', () => ({
  supabase: { from: jest.fn() },
  checkAuthentication: async () => ({ user: { id: 'a' } }),
}));
jest.mock('@/services/analytics', () => ({ analytics: { trackError: jest.fn() } }));
jest.unmock('@/utils/errorHandling');
test('legacy reader add error properties reaching analytics', async () => {
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: async () => ({
      status: 503,
      error: { code: '503', message: 'temporarily unavailable' },
      data: null,
    }),
  };
  jest.mocked(supabase.from).mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);
  await studyWordsFSRSService
    .setFSRSStudyRoot('a', rootId(18276), 'add', managedRequest())
    .catch(e => reportQueryFailure(e, undefined));
  await waitFor(() =>
    expect(analytics.trackError).toHaveBeenCalledWith(
      'Toggle_Study_Word_Check_Error',
      expect.objectContaining({ rootId: 18276 }),
    ),
  );
});
