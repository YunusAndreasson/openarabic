import { renderHook } from '@testing-library/react-native';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import type { FilterState } from '@/store/filtersSlice';

jest.mock('@/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

const { useAppSelector } = require('@/store/hooks');

const baseDate = new Date('2024-01-10T00:00:00.000Z');

type SimpleArticle = {
  id: number;
  title: string;
  author: { id: number; name: string } | null;
  difficulty_level: number;
  created_at: string;
};

const days = (n: number) =>
  new Date(baseDate.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const articles: SimpleArticle[] = [
  { id: 1, title: 'Alpha', author: { id: 1, name: 'Auth1' }, difficulty_level: 2, created_at: days(1) },
  { id: 2, title: 'Beta', author: { id: 2, name: 'Auth2' }, difficulty_level: 4, created_at: days(10) },
  { id: 3, title: 'Gamma', author: { id: 1, name: 'Auth1' }, difficulty_level: 1, created_at: days(20) },
  { id: 4, title: 'Delta', author: { id: 2, name: 'Auth2' }, difficulty_level: 3, created_at: days(40) },
] as any;

const sortFields: FilterState['sort']['field'][] = ['title', 'author', 'date', 'difficulty'];

const cases = [
  {
    name: 'author filter',
    filters: { authorIds: [1], difficultyRange: [1, 5] as [number, number], dateRange: 'all' as const },
    expected: {
      title: [1, 3],
      author: [1, 3],
      date: [3, 1],
      difficulty: [3, 1],
    },
  },
  {
    name: 'difficulty filter',
    filters: { authorIds: [], difficultyRange: [2, 3] as [number, number], dateRange: 'all' as const },
    expected: {
      title: [1, 4],
      author: [1, 4],
      date: [4, 1],
      difficulty: [1, 4],
    },
  },
  {
    name: 'month date filter',
    filters: { authorIds: [], difficultyRange: [1, 5] as [number, number], dateRange: 'month' as const },
    expected: {
      title: [1, 2, 3],
      author: [1, 3, 2],
      date: [3, 2, 1],
      difficulty: [3, 1, 2],
    },
  },
  {
    name: 'week date filter',
    filters: { authorIds: [], difficultyRange: [1, 5] as [number, number], dateRange: 'week' as const },
    expected: {
      title: [1],
      author: [1],
      date: [1],
      difficulty: [1],
    },
  },
];

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(baseDate);
});

afterAll(() => {
  jest.useRealTimers();
});

describe.each(sortFields)('sort by %s', field => {
  it.each(cases)('$name', ({ filters, expected }) => {
    const state: FilterState = { sort: { field, direction: 'asc' }, filters };
    (useAppSelector as jest.Mock).mockImplementation(sel => sel({ filters: state }));

    const { result } = renderHook(() => useFilteredArticles(articles as any));

    expect(result.current.map(a => a.id)).toEqual(expected[field]);
  });
});
