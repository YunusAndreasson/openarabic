import { FAQCategory as FAQCategoryEnum } from '@/types/enums';

// FAQ data structure following Jakob's Law - familiar patterns from popular apps
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategoryEnum;
}

export interface FAQCategoryData {
  name: string;
  items: FAQItem[];
}

export const FAQ_DATA: FAQCategoryData[] = [
  {
    name: FAQCategoryEnum.GETTING_STARTED,
    items: [
      {
        id: 'what-is-app',
        question: 'What is OpenArabic?',
        answer:
          'A free Arabic learning app based on classical Islamic texts. You read bilingual sentence pairs (an Arabic sentence followed by an English sentence), tap words you don’t understand, and add them to a spaced repetition system (FSRS) to learn over time.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'is-this-a-course',
        question: 'Is OpenArabic a course?',
        answer:
          'No. OpenArabic is not a start‑to‑finish course. It is a bilingual reading and listening tool that complements your studies—use it alongside a course or after completing one.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'who-is-this-for',
        question: 'Who is this for?',
        answer:
          'Learners who can decode Arabic and want to read real texts efficiently—especially those studying with a course or who just finished one and need vocabulary to read independently.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'using-with-course',
        question: 'How should I use this with a course?',
        answer:
          'Pair your coursework with short authentic texts. Keep sessions light and regular to build reading stamina. After classes, continue reading to maintain momentum and grow vocabulary.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'after-course-gap',
        question: "I finished a course but can't read books—what now?",
        answer:
          'OpenArabic bridges the post‑course vocabulary gap. Read longer texts with bilingual support, add missing words as you meet them, and gradually progress to more challenging material.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'learning-speed',
        question: 'How quickly will I learn?',
        answer:
          'Learning pace depends on how much you read and review regularly. FSRS optimizes review timing so you spend time efficiently - words you know well appear less often, while challenging words are reviewed more frequently. Most users see steady vocabulary growth with daily 15-30 minute sessions.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
    ],
  },
  {
    name: FAQCategoryEnum.FEATURES,
    items: [
      {
        id: 'spaced-repetition',
        question: 'How does spaced repetition work?',
        answer:
          "We use FSRS (Free Spaced Repetition Scheduler) to predict when you'll forget words and schedule reviews at the optimal time. Each time you review a word, the system adjusts its difficulty rating and schedules the next review accordingly.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'article-selection',
        question: 'How are recommended articles selected?',
        answer:
          'The Featured section surfaces articles with mostly known vocabulary and a small, meaningful challenge (i+1). This keeps reading smooth while steadily growing your knowledge and balancing your due reviews.',
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'word-difficulty',
        question: 'How is word difficulty determined?',
        answer:
          "Word difficulty is calculated from your review history using FSRS. It considers how quickly you recall words, how consistent your responses are, and how much time has passed since your last review. There are no fixed difficulty levels - each word's rating adapts based on your personal learning patterns.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'audio-features',
        question: 'What audio features are available?',
        answer:
          'Audio playback with mini-player controls, sleep timer, and bookmarks management. Audio caches after you play an article the first time for offline listening. Controls emphasize Play and Stop for clarity.',
        category: FAQCategoryEnum.FEATURES,
      },
    ],
  },
  {
    name: FAQCategoryEnum.OFFLINE_STORAGE,
    items: [
      {
        id: 'offline-mode',
        question: 'Does this work offline?',
        answer:
          'Yes, with limitations. You can review vocabulary offline, and previously cached audio plays without a connection. New content and progress sync require an internet connection.',
        category: FAQCategoryEnum.OFFLINE_STORAGE,
      },
      {
        id: 'audio-caching',
        question: 'How does audio caching work?',
        answer:
          'Audio files are cached after your first play. This means you can listen to articles offline after loading them once. Cached audio is stored locally and persists between sessions.',
        category: FAQCategoryEnum.OFFLINE_STORAGE,
      },
    ],
  },
  {
    name: FAQCategoryEnum.LEARNING_APPROACH,
    items: [
      {
        id: 'how-learning-works',
        question: 'How does learning work here?',
        answer:
          'You read bilingual sentence pairs that you mostly understand, with a few new items in each article. Tap unknown words to add them to spaced repetition. Steady reading builds patterns without memorizing rules.',
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
      {
        id: 'i-plus-one',
        question: 'What does i+1 mean?',
        answer:
          'Your current level (i) plus a small step (+1). Content stays readable while gently pushing growth.',
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
      {
        id: 'why-classical-texts',
        question: 'Why classical texts?',
        answer:
          'They build accurate Arabic patterns and core vocabulary from the source, and make moving to modern formal Arabic straightforward.',
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
      {
        id: 'scope',
        question: 'What’s the scope of this app?',
        answer:
          'It’s a language tool for reading and vocabulary. For theological guidance, consult qualified scholars and reliable references.',
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
    ],
  },
  {
    name: FAQCategoryEnum.PRIVACY_DATA,
    items: [
      {
        id: 'privacy-data',
        question: 'What data do you store?',
        answer:
          'Your account email, study items and review history, reading list, and basic settings. No ads and no third‑party analytics; diagnostics are minimal and used only to improve reliability.',
        category: FAQCategoryEnum.PRIVACY_DATA,
      },
    ],
  },
];
