export type SortDirection = 'asc' | 'desc';

export interface SortOption<T = string> {
  key: T;
  label: string;
}
