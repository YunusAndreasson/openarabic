// Bundled first-page excerpt, exported 2026-11-23 from the published OpenArabic
// database (Supabase project open-arabic): article 559, sentences 7106-7107
// (positions 3-4), sentence_words 59283-59300. Provenance, gaps and credits are
// recorded in onboarding/2026-11/openarabic/dev/content/content.md.
//
// - gloss: sentence_words.english. form: sentence_words.word_form, unchanged.
// - segments: the app's own reader output (computeColoredSegments) for that form
//   and gloss; the database stores no segments.
// - practice: the occurrence's saved dictionary entry (roots row of
//   sentence_words.root_id). Absent for وَقَعْتُ, whose entry is malformed.
// - origin: root_enrichment for root_id 18276.
// - audio: sentence_words.audio_url per occurrence; the excerpt recording joins
//   the two sentences' Arabic recordings (article_sentences.audio_url).
// Nothing here is fetched at runtime.
import type { BundledPassage } from '@/services/firstPage';

export const passageFixture: BundledPassage = {
  articleId: 559,
  title: 'A Life of Reading and Writing',
  author: 'Ibn al-Jawzī',
  category: 'Sīrah',
  credit: 'Source: Ṣayd al-Khāṭir',
  cover: require('./books.jpg') as number,
  audio: require('./audio/excerpt.mp3') as number,
  sentences: [
    {
      sentenceId: 7106,
      translation:
        'When I saw a book I had not seen before, it was as if I had stumbled upon a treasure.',
      words: [
        {
          form: 'وَإِذَا',
          gloss: 'and when',
          audio: require('./audio/words/w7106_00.mp3') as number,
          segments: [
            { text: 'وَ', role: 'conjunction' },
            { text: 'إِذَا', role: 'particle' },
          ],
          practice: { occurrenceId: 59283, rootId: 5506, letters: 'إِذَا', meaning: 'when' },
        },
        {
          form: 'رَأَيْتُ',
          gloss: 'I saw',
          audio: require('./audio/words/w7106_01.mp3') as number,
          segments: [{ text: 'رَأَيْ' }, { text: 'تُ', role: 'verbConjugation' }],
          practice: { occurrenceId: 59284, rootId: 9470, letters: 'رَأَيْتُ', meaning: 'saw' },
        },
        {
          form: 'كتابًا',
          gloss: 'a book',
          audio: require('./audio/words/w7106_02.mp3') as number,
          practice: { occurrenceId: 59285, rootId: 18274, letters: 'كِتَابًا', meaning: 'a book' },
        },
        {
          form: 'لَمْ',
          gloss: 'did not',
          audio: require('./audio/words/w7106_03.mp3') as number,
          practice: { occurrenceId: 59286, rootId: 5280, letters: 'لَمْ', meaning: 'does not' },
        },
        {
          form: 'أَرَهُ',
          gloss: 'see it',
          audio: require('./audio/words/w7106_04.mp3') as number,
          practice: { occurrenceId: 59287, rootId: 18275, letters: 'أَرَهُ', meaning: 'see it' },
        },
        {
          form: 'فَكَأَنِّي',
          gloss: 'so as if I',
          audio: require('./audio/words/w7106_05.mp3') as number,
          segments: [
            { text: 'فَ', role: 'conjunction' },
            { text: 'كَ', role: 'preposition' },
            { text: 'أَنِّي' },
          ],
          practice: { occurrenceId: 59288, rootId: 16834, letters: 'كَأَنِّي', meaning: 'as if I' },
        },
        {
          form: 'وَقَعْتُ',
          gloss: 'I stumbled upon',
          audio: require('./audio/words/w7106_06.mp3') as number,
          segments: [{ text: 'وَقَعْ' }, { text: 'تُ', role: 'verbConjugation' }],
        },
        {
          form: 'عَلَى',
          gloss: 'on',
          audio: require('./audio/words/w7106_07.mp3') as number,
          practice: { occurrenceId: 59290, rootId: 5355, letters: 'عَلَى', meaning: 'upon' },
        },
        {
          form: 'كَنْزٍ',
          gloss: 'a treasure',
          audio: require('./audio/words/w7106_08.mp3') as number,
          suggested: true,
          practice: { occurrenceId: 59291, rootId: 18276, letters: 'كَنْزٍ', meaning: 'a treasure' },
          origin: {
            letters: 'ك ن ز',
            meaning: 'k-n-z · to store up, treasure',
            note: "The core idea is storing or hoarding something valuable, especially wealth. In Qur'anic usage it often carries a warning about amassing riches instead of spending in God's way. The noun كَنْزٌ is the most common form learners will meet.",
          },
        },
      ],
    },
    {
      sentenceId: 7107,
      translation: 'Indeed, I examined the register of books endowed to the Nizamiyya school.',
      words: [
        {
          form: 'وَلَقَدْ',
          gloss: 'and indeed',
          audio: require('./audio/words/w7107_00.mp3') as number,
          segments: [
            { text: 'وَ', role: 'conjunction' },
            { text: 'لَ', role: 'particle' },
            { text: 'قَدْ' },
          ],
          practice: { occurrenceId: 59292, rootId: 8040, letters: 'لَقَدْ', meaning: 'certainly' },
        },
        {
          form: 'نَظَرْتُ',
          gloss: 'I examined',
          audio: require('./audio/words/w7107_01.mp3') as number,
          segments: [{ text: 'نَظَرْ' }, { text: 'تُ', role: 'verbConjugation' }],
          practice: { occurrenceId: 59293, rootId: 9482, letters: 'نَظَرْتُ', meaning: 'looked' },
        },
        {
          form: 'فِي',
          gloss: 'in',
          audio: require('./audio/words/w7107_02.mp3') as number,
          practice: { occurrenceId: 59294, rootId: 5222, letters: 'فِي', meaning: 'in' },
        },
        {
          form: 'ثَبْتِ',
          gloss: 'the register of',
          audio: require('./audio/words/w7107_03.mp3') as number,
          practice: { occurrenceId: 59295, rootId: 18277, letters: 'ثَبْتِ', meaning: 'register' },
        },
        {
          form: 'الْكُتُبِ',
          gloss: 'the books',
          audio: require('./audio/words/w7107_04.mp3') as number,
          segments: [{ text: 'الْ', role: 'definiteArticle' }, { text: 'كُتُبِ' }],
          practice: { occurrenceId: 59296, rootId: 14087, letters: 'كُتُبِ', meaning: 'the books' },
        },
        {
          form: 'الْمَوْقُوفَةِ',
          gloss: 'endowed',
          audio: require('./audio/words/w7107_05.mp3') as number,
          segments: [{ text: 'الْ', role: 'definiteArticle' }, { text: 'مَوْقُوفَةِ' }],
          practice: {
            occurrenceId: 59297,
            rootId: 18278,
            letters: 'مَوْقُوفَةِ',
            meaning: 'endowed',
          },
        },
        {
          form: 'فِي',
          gloss: 'in',
          audio: require('./audio/words/w7107_06.mp3') as number,
          practice: { occurrenceId: 59298, rootId: 5222, letters: 'فِي', meaning: 'in' },
        },
        {
          form: 'الْمَدْرَسَةِ',
          gloss: 'the school',
          audio: require('./audio/words/w7107_07.mp3') as number,
          segments: [{ text: 'الْ', role: 'definiteArticle' }, { text: 'مَدْرَسَةِ' }],
          practice: {
            occurrenceId: 59299,
            rootId: 18279,
            letters: 'مَدْرَسَةِ',
            meaning: 'the school',
          },
        },
        {
          form: 'النِّظَامِيَّةِ',
          gloss: 'Nizamiyya',
          audio: require('./audio/words/w7107_08.mp3') as number,
          segments: [{ text: 'ال', role: 'definiteArticle' }, { text: 'نِّظَامِيَّةِ' }],
          practice: {
            occurrenceId: 59300,
            rootId: 18280,
            letters: 'نِّظَامِيَّةِ',
            meaning: 'Nizamiyya',
          },
        },
      ],
    },
  ],
};
