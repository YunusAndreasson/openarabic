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
        answer: `OpenArabic is a free Arabic learning app built around classical Islamic texts. You read bilingual sentence pairs, tap words you don't know, and add them to spaced repetition to learn over time.\n\nDeveloped by Yunus Andréasson. Questions or feedback? yunus+openarabic@edenmind.com`,
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'is-this-a-course',
        question: 'Is OpenArabic a course?',
        answer:
          'No—OpenArabic is a bilingual reading and listening tool, not a structured course. Use it alongside your studies or after finishing a course to keep building vocabulary.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'who-is-this-for',
        question: 'Who is this for?',
        answer:
          "Anyone who can read Arabic script and wants to build vocabulary through real texts—especially if you're studying with a course or just finished one and want to read independently.",
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'using-with-course',
        question: 'How should I use this with a course?',
        answer:
          'Read alongside your coursework to build fluency with real texts. Even 10–15 minutes daily makes a difference. Reading between classes keeps your momentum going and expands your vocabulary naturally.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'after-course-gap',
        question: "I finished a course but can't read books—what now?",
        answer:
          "OpenArabic is designed for this gap. Read texts with bilingual support, add unknown words as you encounter them, and move to harder material once you understand 90–95% of what you're reading.",
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'learning-speed',
        question: 'How quickly will I learn?',
        answer:
          'It depends on how often you read and review. The app schedules reviews just before you forget—easy words appear less often, harder words more often. Daily 15–30 minute sessions tend to show noticeable progress within a few weeks.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
    ],
  },
  {
    name: FAQCategoryEnum.FEATURES,
    items: [
      {
        id: 'article-selection',
        question: 'How are recommended articles selected?',
        answer:
          "Recommended articles contain 90–95% words you already know, with just 5–10% new vocabulary (the i+1 principle). This keeps reading enjoyable while introducing new words at a pace that won't overwhelm your review queue.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'word-difficulty',
        question: 'How is word difficulty determined?',
        answer:
          "There are no fixed difficulty levels. Each word's difficulty adapts to you based on how quickly you recall it, how consistent your responses are, and how much time has passed since your last review.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'why-review-before-adding',
        question: 'Why should I review before adding more words?',
        answer:
          'Your brain can only consolidate so much at once. Adding too many new words without reviewing existing ones leads to forgetting and wasted effort.\n\nFinish your Due reviews before adding new vocabulary—this strengthens what you already know and prevents having to relearn forgotten words. Aim for at least 75% Memory Strength before adding more.',
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'understanding-memory-strength',
        question: 'How does Memory Strength work?',
        answer:
          "Memory Strength shows the percentage of words you're expected to remember right now across all your vocabulary.\n\nDue words are scheduled just before you'd forget them. Reviewing on time keeps your memory fresh and sets the right interval for next time.\n\nLearned words have entered long-term memory. They still need regular review, but intervals grow longer after each successful recall.\n\nMastered words have been reviewed consistently enough that intervals stretch to months or years—while keeping retention above 90%.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'how-spaced-repetition-works-detailed',
        question: 'How does the spacing algorithm work?',
        answer:
          "Your memory follows a predictable curve—new information fades quickly at first, then more slowly over time. Spaced repetition uses this to show words just before you'd forget them.\n\nEach successful review strengthens the memory and pushes the next review further out. Easy words appear less often, harder words more often.\n\nThe algorithm adapts to your personal learning patterns based on response speed, consistency, and history. Try to complete your Due reviews daily—missing even a few days creates backlogs that are harder to catch up on.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'arabic-text-coloring',
        question: 'Why is Arabic text colored in the app?',
        answer:
          'Arabic text is color-coded so you can see how words are built from smaller parts at a glance.\n\nPrefixes like و (and), ب (with), ل (to) appear in green. Suffixes like ي (my), ك (your), ه (his) appear in orange. Diacritics (case endings) appear in blue. Infixes (verb form markers) appear in purple.\n\nWhy only multi-word phrases? A single word like "house" doesn\'t benefit from color-coding. But "and the house" shows how و (and) + ال (the) attach to the root word—helping you understand Arabic grammar naturally as you read.\n\nSee the colored examples below.',
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'play-all-long-press',
        question: 'How do I temporarily play Arabic-only audio?',
        answer:
          'Long-press the "Play all" button in your Playlist to switch to Arabic-only audio for the current session. Your regular language setting returns automatically when playback ends.\n\nUseful when you want to practice listening without English, even if your default includes both languages.',
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
          'Yes. You can review vocabulary and play cached audio without a connection. New content and progress syncing require internet.',
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
          'Read bilingual sentence pairs, tap unknown words to add them to spaced repetition, and review regularly. Over time you build pattern recognition naturally—without explicit grammar study.',
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
      {
        id: 'i-plus-one',
        question: 'What does i+1 mean?',
        answer:
          'Your current level (i) plus one step beyond (+1). At 90–95% comprehension, you understand enough context to figure out new words from what surrounds them—challenging enough to learn, easy enough to follow.',
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
      {
        id: 'why-classical-texts',
        question: 'Why classical texts?',
        answer:
          "Classical texts contain the full Arabic grammatical system and core vocabulary in authentic contexts. You learn Arabic as it's actually used—not simplified textbook versions. Since Modern Standard Arabic evolved from classical Arabic, building a classical foundation makes the transition seamless.",
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
      {
        id: 'scope',
        question: 'What’s the scope of this app?',
        answer:
          'OpenArabic is a language tool for reading and vocabulary—not a religious guide. For theological questions, consult qualified scholars and reliable references.',
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
          'Your email, vocabulary and review history, reading list, and preferences. No ads, no third-party analytics. Crash diagnostics are collected to fix bugs—nothing else.',
        category: FAQCategoryEnum.PRIVACY_DATA,
      },
    ],
  },
];
