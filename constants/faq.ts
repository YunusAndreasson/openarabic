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
        answer: `OpenArabic is a free Arabic learning app built around classical Islamic texts. You read bilingual sentence pairs, tap words you don't know, and add them to spaced repetition to learn over time.\n\nDeveloped by Yunus Andréasson. Questions or feedback? contact@openarabic.io`,
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
          "There are no fixed difficulty levels. Each word's difficulty adapts to you from the grades you give it (Forgot, Barely or Knew it) and how much time had passed since you last saw it.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'why-review-before-adding',
        question: 'Why should I review before adding more words?',
        answer:
          'Your brain can only consolidate so much at once. Adding too many new words without reviewing existing ones leads to forgetting and wasted effort.\n\nClear the words due today before adding new ones—this strengthens what you already know and saves relearning words you have forgotten. If too many reviews are waiting, the app asks you to clear some first, and Adaptive pacing (in Settings) pauses new words while your recall is low.',
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'words-you-would-recall',
        question: 'What does "Words you\'d recall right now" mean?',
        answer:
          "It is an estimate, worked out from each word's review history, of how many of your practised words you would remember if asked right now. Words still waiting for their first review are not counted.\n\nEvery practised word also has a memory horizon: how long it holds before recall drops to 90%. Every review you get right pushes it further out, so the typical word's horizon grows from days to weeks to months.\n\nWords come up for review when their horizon runs out. Reviewing them on the day they are due keeps the estimate high.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'how-spaced-repetition-works-detailed',
        question: 'How does the spacing algorithm work?',
        answer:
          "Your memory follows a predictable curve—new information fades quickly at first, then more slowly over time. Spaced repetition uses this to show words just before you'd forget them.\n\nEach successful review strengthens the memory and pushes the next review further out. Easy words appear less often, harder words more often.\n\nThe algorithm adapts to you from the grades you give each word and the time between reviews. Try to clear the words due each day—missing even a few days creates backlogs that are harder to catch up on.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'arabic-text-coloring',
        question: 'Why is Arabic text coloured in the app?',
        answer:
          'Arabic text is colour-coded so you can see how words are built from smaller parts at a glance.\n\nThe colour tells you what a part does, not where it sits in the word. ال (the) keeps its own colour whether it starts the word or follows a preposition; possessive endings like ي (my), ك (your) and ه (his) share a different one. The English translation is coloured to match, so each Arabic part lines up with the English word it becomes. The colour guide below names them.\n\nWhy only multi-word phrases? A single word like "house" doesn\'t benefit from colour-coding. But "and the house" shows how و (and) + ال (the) attach to the root word—helping you understand Arabic grammar naturally as you read.\n\nA word in [brackets] was added to the English. Arabic writes "the" in places where English leaves it out, so the brackets mark a word supplied to show you the match.\n\nSee the coloured examples below.',
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
          'Your email, vocabulary and review history, playlist and preferences, so your progress syncs across devices. There are no ads.\n\nThree outside services see some of it. Mixpanel receives product analytics: events such as signing in or finishing a practice session. Sentry receives crash diagnostics so bugs can be fixed. If you installed OpenArabic from a Facebook or Instagram ad, Meta receives a few app events so we can tell whether the ad worked—never your name, your email or what you study.\n\nThe Privacy Policy, under About in Settings, has the full detail.',
        category: FAQCategoryEnum.PRIVACY_DATA,
      },
    ],
  },
];
