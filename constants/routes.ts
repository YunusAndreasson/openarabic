export const getArticleRoute = (id: number, headerTitle?: string): string => {
  const base = `/(tabs)/read/article/${id}`;
  return headerTitle ? `${base}?headerTitle=${encodeURIComponent(headerTitle)}` : base;
};

export const getFilterRoute = (
  type: 'category' | 'author',
  id: number,
  name?: string,
): string => {
  const base = `/(tabs)/read/filter?type=${type}&id=${id}`;
  return name ? `${base}&name=${encodeURIComponent(name)}` : base;
};

export const getFilterModalRoute = (categoryId: number): string =>
  `/(tabs)/read/filterModal?categoryId=${categoryId}`;
