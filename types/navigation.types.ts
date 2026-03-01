/**
 * Type for filter parameters with discriminated union
 */
export type FilterParams =
  | {
      type: 'author';
      id: string;
      name?: string;
      headerTitle?: string;
    }
  | {
      type: 'category';
      id: string;
      name?: string;
      headerTitle?: string;
    };
