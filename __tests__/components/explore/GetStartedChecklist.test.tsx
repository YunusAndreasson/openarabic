/**
 * GetStartedChecklist — per-step routing and the derived progress label.
 *
 * Every row used to push the same starter article, so "Practice your first word"
 * would have dropped the user back into a text. The denominator used to be
 * hardcoded to 3 while the item list was computed.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { OnboardingStep } from '@/constants/onboarding';
import { ROUTE_PATHS } from '@/constants/routes';
import type { Article } from '@/types/articles.types';

const mockPush = jest.fn();
const mockNavigate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
}));

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/articles/useReadingProgress', () => ({
  useBulkReadingProgress: () => ({ data: new Map() }),
}));

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn() },
}));

jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

jest.mock('@/utils/articleUtils', () => ({
  pickStarterArticle: () => ({ id: 7, title: 'A Starter Text' }),
}));

import { GetStartedChecklist } from '@/components/explore/GetStartedChecklist';

const ARTICLES = [{ id: 7, title: 'A Starter Text' }] as unknown as Article[];

type ChecklistProp = React.ComponentProps<typeof GetStartedChecklist>['checklist'];

const buildChecklist = (overrides: Partial<ChecklistProp> = {}): ChecklistProp =>
  ({
    isEligible: true,
    isChecklistVisible: true,
    doneCount: 0,
    allDone: false,
    finalizeCompletion: jest.fn(),
    items: [
      { step: OnboardingStep.READ_TEXT, label: 'Read your first text', done: false },
      { step: OnboardingStep.SAVE_WORD, label: 'Save a word to practice', done: false },
      { step: OnboardingStep.LISTEN_AUDIO, label: 'Listen to bilingual audio', done: false },
      { step: OnboardingStep.PRACTICE_WORD, label: 'Practice your first word', done: false },
    ],
    ...overrides,
  }) as ChecklistProp;

describe('GetStartedChecklist', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockNavigate.mockReset();
  });

  it('derives the progress denominator from the item list', () => {
    const { getByText } = render(
      <GetStartedChecklist articlesData={ARTICLES} checklist={buildChecklist({ doneCount: 1 })} />,
    );

    expect(getByText('1 of 4')).toBeTruthy();
  });

  it('sends the practice row to the Practice tab, not into an article', () => {
    const { getByText } = render(
      <GetStartedChecklist articlesData={ARTICLES} checklist={buildChecklist()} />,
    );

    fireEvent.press(getByText('Practice your first word'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.PRACTICE_TAB);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sends the reading rows into the starter article', () => {
    const { getByText } = render(
      <GetStartedChecklist articlesData={ARTICLES} checklist={buildChecklist()} />,
    );

    fireEvent.press(getByText('Read your first text'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(String(mockPush.mock.calls[0]?.[0])).toContain('/article/7');
  });

  it('renders nothing while the welcome intro is on screen', () => {
    const { queryByText } = render(
      <GetStartedChecklist
        articlesData={ARTICLES}
        checklist={buildChecklist()}
        isSuppressedByIntro={true}
      />,
    );

    expect(queryByText('Get started')).toBeNull();
  });

  it('renders nothing once the checklist has been completed', () => {
    const { queryByText } = render(
      <GetStartedChecklist
        articlesData={ARTICLES}
        checklist={buildChecklist({ isChecklistVisible: false })}
      />,
    );

    expect(queryByText('Get started')).toBeNull();
  });
});
