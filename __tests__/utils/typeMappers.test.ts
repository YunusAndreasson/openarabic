import { mapToArticle, mapToArticles } from '../../utils/typeMappers';

describe('typeMappers', () => {
  const rawWord = {
    id: 1,
    position: 1,
    word_form: 'word',
    english: 'word',
    difficulty_level: 1,
    grammar_note: null,
    root_id: 1,
    sentence_id: 1,
    word_type_id: 1,
    audio_start: '0',
    audio_end: '1',
    root: { id: 1, letters: 'r', meaning: 'm' },
    word_type: { id: 1, name: 'noun' },
  } as any;

  const rawSentence = {
    id: 1,
    position: 1,
    arabic: 'a',
    english: 'a',
    article_id: 1,
    audio_url: null,
    sentence_words: [rawWord],
  } as any;

  const rawArticle = {
    id: 1,
    title: 'Article',
    created_at: '',
    image_url: null,
    difficulty_level: 1,
    category_id: 1,
    author_id: 1,
    summary: '',
    audio_url: 'audio.mp3',
    article_sentences: [rawSentence],
    category: { id: 1, name: 'cat' },
    author: { id: 1, name: 'auth' },
  } as any;

  it('maps nested article to typed article', () => {
    const article = mapToArticle(rawArticle);

    expect(article.title).toBe('Article');
    expect(article.article_sentences?.[0].id).toBe(1);
    expect(article.article_sentences?.[0].sentence_words?.[0].id).toBe(1);
    expect(article.category).toEqual({ id: 1, name: 'cat' });
    expect(article.author).toEqual({ id: 1, name: 'auth' });
  });

  it('handles missing or invalid properties with defaults', () => {
    const invalidArticle = {
      id: 2,
      title: 'Invalid',
      article_sentences: [
        {
          id: 2,
          sentence_words: 'bad',
        },
      ],
      created_at: '',
      image_url: '',
      difficulty_level: 1,
      category_id: 1,
      author_id: 1,
      summary: '',
      audio_url: 'audio.mp3',
      category: { id: 1, name: 'cat' },
      author: { id: 1, name: 'auth' },
    } as any;

    const mapped = mapToArticle(invalidArticle);

    expect(mapped.article_sentences?.[0].sentence_words).toEqual([]);
    expect(mapped.article_sentences?.[0].position).toBeUndefined();
    expect(mapped.audio_url).toBe('audio.mp3');
    expect(mapped.author).toEqual({ id: 1, name: 'auth' });
    expect(mapped.category).toEqual({ id: 1, name: 'cat' });
  });

  it('maps arrays of records and handles invalid input', () => {
    const articles = mapToArticles([rawArticle]);
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Article');

    const empty = mapToArticles('nope' as any);
    expect(empty).toEqual([]);
  });
});
