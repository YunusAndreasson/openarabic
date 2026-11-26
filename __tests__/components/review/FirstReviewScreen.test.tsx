import { expect, jest, test } from '@jest/globals';
import { AuthContext } from '@/components/providers/AuthProvider';
import { TutorialId } from '@/constants/tutorials';
import { useTutorialManager } from '@/hooks/tutorials/useTutorialManager';
import { StyleSheet, Text } from 'react-native';
import * as paragraphs from '@/utils/skiaParagraphBuilder';
import { mockReviewStorage } from '@/__tests__/helpers/reviewStorage';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { FirstReviewReceipt } from '@/components/practice/FirstReviewReceipt';
import { getFirstReviewReceiptRoute } from '@/utils/routeBuilders';
import { FirstReviewScreen } from '@/components/review/FirstReviewScreen';
import { STRINGS } from '@/constants/strings';
import { fsrsQueries } from '@/constants/queries';
import { resumeFirstReview, startFirstReview } from '@/services/firstReview';
import { loadFirstReviewCard, sendFirstReview } from '@/services/firstReviewRpc';
import { loadFirstPage } from '@/services/firstPage';
import type { RootId } from '@/types/branded.types';

jest.mock('@/hooks/auth/useProvideAuth', () => ({ useProvideAuth: jest.fn() }));
jest.mock('@/hooks/theme/useSkiaGpuAvailable', () => ({ useSkiaGpuAvailable: () => false }));
jest.mock('@/hooks/theme/useSkiaFonts', () => ({
  useSkiaFonts: () => ({ fontManager: null, fontFamily: 'Noto Sans Arabic' }),
}));

let mockSchedule: ReturnType<typeof createTestWord>[] = [];
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
  Stack: { Screen: () => null },
  router: { dismissTo: jest.fn() },
}));
jest.mock('@/hooks/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'reader' } }) }));
jest.mock('@/services/firstReviewRpc', () => ({
  loadFirstReviewCard: jest.fn(),
  sendFirstReview: jest.fn(),
}));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: { getFSRSWords: async () => mockSchedule },
}));
jest.mock('@/services/installAttribution', () => ({ trackActivated: jest.fn() }));

async function openReviewForBook() {
  mockReviewStorage();
  const line = loadFirstPage().sentences[0]!;
  const word = line.words.find(w => w.form === 'كتابًا')!;
  const entry = word.practice!;
  const root = entry.rootId as RootId;
  await startFirstReview({
    version: 1,
    id: 'one-word',
    phase: 'saved',
    owner: 'reader',
    method: 'sheet',
    word: {
      rootId: root,
      occurrenceId: entry.occurrenceId,
      source: 'first_run_reader',
      form: word.form,
      gloss: word.gloss,
    },
  });
  const sentence = line.words.map(w => w.form).join(' ');
  let offset = 0;
  const segments = line.words.flatMap((w, i) =>
    [...(i ? [{ text: ' ' }] : []), ...(w.segments ?? [{ text: w.form }])].map(run => {
      const segment = { ...run, offset };
      offset += run.text.length;
      return segment;
    }),
  );
  jest.mocked(loadFirstReviewCard).mockResolvedValue({
    row: createTestWord({ root_id: root }),
    revision: null,
    letters: entry.letters,
    meaning: entry.meaning,
    sentence,
    segments,
    translation: line.translation,
  });
  const { wrapper, queryClient } = createHookTestWrapper({ withRedux: true });
  const view = render(<FirstReviewScreen rootId={root} />, { wrapper });
  const reveal = await screen.findByText(STRINGS.SHOW_ANSWER);
  return { line, entry, root, sentence, view, reveal, queryClient };
}

test('without a GPU, revealing كتابًا wraps complete words at the measured card width', async () => {
  const shape = jest.spyOn(paragraphs, 'buildWordParagraph');
  const { line, sentence, reveal } = await openReviewForBook();
  fireEvent.press(reveal);
  const row = await screen.findByLabelText(sentence);
  expect(StyleSheet.flatten(row.props.style)).toMatchObject({
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
  });
  // Replay the actual inner card width, then a narrower split-screen layout.
  for (const width of [329, 148]) {
    fireEvent(row, 'layout', { nativeEvent: { layout: { width } } });
    for (const { form } of line.words) {
      const text = screen.getByText(form, { includeHiddenElements: true });
      expect(text.props.numberOfLines).toBe(1);
      expect(text.props.adjustsFontSizeToFit).toBe(true);
      expect(StyleSheet.flatten(text.props.style).maxWidth).toBe(width);
    }
  }
  expect(shape).not.toHaveBeenCalled();
});

test('only reveal exposes the dictionary meaning and inflected sentence, and only acknowledgement exposes the receipt', async () => {
  const now = new Date(2026, 10, 24, 20, 5).getTime();
  jest.setSystemTime(now);
  const firstDue = new Date(now + 600_000).toISOString();
  jest
    .mocked(sendFirstReview)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      status: 'confirmed',
      complete: true,
      revision: 'v1',
      due: firstDue,
      replayed: true,
      reviewed: new Date(now).toISOString(),
    });
  const user = { id: 'reader', created_at: new Date(now).toISOString() };
  const tutorial = renderHook(useTutorialManager, {
    wrapper: ({ children }) => (
      <AuthContext value={{ user, session: { user }, isAuthenticated: true, isLoading: false }}>
        {children}
      </AuthContext>
    ),
  });
  await waitFor(() =>
    expect(tutorial.result.current.shouldShowTutorial(TutorialId.REVIEW_GRADES)).toBe(true),
  );
  const { line, entry, root, sentence, view, reveal } = await openReviewForBook();
  expect(view.queryByText(entry.meaning)).toBeNull();
  expect(view.queryByText(line.translation)).toBeNull();
  fireEvent.press(reveal);
  expect(await view.findByText(entry.meaning)).toBeTruthy();
  expect(view.getByLabelText(sentence)).toBeTruthy();
  fireEvent.press(view.getByText(STRINGS.GRADE_KNEW_IT));
  expect(await view.findByText(STRINGS.FIRST_REVIEW_FAILED)).toBeTruthy();
  expect(view.queryByText(STRINGS.METRIC_WORDS_REVIEWED(1))).toBeNull();
  fireEvent.press(view.getByText(STRINGS.PLEASE_TRY_AGAIN));
  await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith(getFirstReviewReceiptRoute(root)));
  // The already-mounted tutorial provider must know before ordinary Practice opens.
  expect(tutorial.result.current.shouldShowTutorial(TutorialId.REVIEW_GRADES)).toBe(false);
  mockSchedule = [createTestWord({ root_id: root, fsrs_due: firstDue })];
  view.rerender(<FirstReviewReceipt owner="reader" root={root} fallback={null} />);
  expect(await view.findByText(STRINGS.METRIC_WORDS_REVIEWED(1))).toBeTruthy();
  expect(await view.findByText(STRINGS.WORD_STAT_NEXT_REVIEW)).toBeTruthy();
});

test.each(['clock', 'rescheduled'] as const)(
  'retires a mounted receipt when its confirmed schedule expires or changes (%s)',
  async change => {
    const now = new Date(2026, 10, 24, 20, 5).getTime();
    jest.setSystemTime(now);
    const due = new Date(now + 600_000).toISOString();
    jest.mocked(sendFirstReview).mockResolvedValue({
      status: 'confirmed',
      complete: true,
      revision: 'v1',
      due,
      replayed: false,
      reviewed: new Date(now).toISOString(),
    });
    const { root, view, reveal, queryClient } = await openReviewForBook();
    fireEvent.press(reveal);
    fireEvent.press(await screen.findByText(STRINGS.GRADE_KNEW_IT));
    await waitFor(() => expect(mockRedirect).toHaveBeenCalled());
    mockSchedule = [createTestWord({ root_id: root, fsrs_due: due })];
    view.rerender(
      <FirstReviewReceipt owner="reader" root={root} fallback={<Text>Dashboard</Text>} />,
    );
    expect(await screen.findByText(STRINGS.WORD_STAT_NEXT_REVIEW)).toBeTruthy();
    if (change === 'clock') {
      await act(async () => {
        jest.advanceTimersByTime(600_001);
      });
    } else {
      mockSchedule = [
        createTestWord({ root_id: root, fsrs_due: new Date(2026, 10, 26, 20, 51).toISOString() }),
      ];
      act(() => {
        queryClient.setQueryData(fsrsQueries.all('reader').queryKey, mockSchedule);
      });
    }
    expect(await screen.findByText('Dashboard')).toBeTruthy();
    expect(screen.queryByText(STRINGS.WORD_STAT_NEXT_REVIEW)).toBeNull();
    expect(await resumeFirstReview('reader', root)).toBeUndefined();
  },
);
