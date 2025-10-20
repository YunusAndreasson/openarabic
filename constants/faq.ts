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
          'Pair your coursework with authentic texts. Read regularly to build stamina—even 10-15 minutes daily works. Continue reading between classes to maintain momentum and expand vocabulary.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'after-course-gap',
        question: "I finished a course but can't read books—what now?",
        answer:
          'OpenArabic bridges the post‑course vocabulary gap. Read texts with bilingual support, add unknown words as you encounter them, then move to harder material when you understand 90-95% of current content.',
        category: FAQCategoryEnum.GETTING_STARTED,
      },
      {
        id: 'learning-speed',
        question: 'How quickly will I learn?',
        answer:
          'Your learning pace scales with reading and review frequency. FSRS schedules reviews just before you forget words—easy words appear less often, challenging words more often. Daily 15-30 minute sessions typically yield measurable vocabulary growth within weeks.',
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
          "FSRS (Free Spaced Repetition Scheduler) predicts when you'll forget words and schedules reviews just before that happens. Each review adjusts the word's difficulty rating and next review interval based on your recall performance.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'article-selection',
        question: 'How are recommended articles selected?',
        answer:
          'Featured articles contain 90-95% known vocabulary with 5-10% new words (i+1 principle). This comprehension level maintains reading flow while adding new vocabulary at a sustainable pace and balancing your review workload.',
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
        id: 'learned-vs-mastered',
        question: 'What is the difference between Learned and Mastered?',
        answer:
          "Learned words have moved to long-term memory (FSRS State 2) and need regular review to build retention strength. Mastered words have achieved high stability through consistent successful reviews—their intervals extend to months or years between reviews. FSRS tracks retention strength and schedules each review just before forgetting occurs.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'why-review-before-adding',
        question: 'Why should I review before adding more words?',
        answer:
          "Your brain consolidates limited information at once. Adding too many words without reviewing existing ones overwhelms memory and reduces retention.\n\nComplete Due reviews before adding vocabulary—this strengthens neural connections and prevents relearning forgotten words.\n\nTarget 75% Memory Strength before adding new words. This threshold ensures existing vocabulary is stable before expanding your learning load.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'understanding-memory-strength',
        question: 'How does Memory Strength work?',
        answer:
          "Memory Strength shows your overall recall probability—the percentage of words you're expected to remember right now, calculated across all vocabulary using FSRS.\n\nDue words are scheduled just before forgetting. Reviews catch words before they fade and recalibrate your next review interval.\n\nLearned words have graduated to long-term memory (FSRS State 2). They need regular review to build stability, with intervals growing longer after each successful recall.\n\nMastered words have achieved high stability through consistent successful reviews. Their review intervals extend to months or years while maintaining retention above 90%.",
        category: FAQCategoryEnum.FEATURES,
      },
      {
        id: 'how-spaced-repetition-works-detailed',
        question: 'How does the spacing algorithm work?',
        answer:
          "Your memory follows a predictable forgetting curve—information fades rapidly at first, then more slowly over time. Spaced repetition shows words just before you forget them.\n\nEach successful review strengthens memory and extends the interval to the next review. Easy words appear less frequently, challenging words more often. You focus effort where needed most.\n\nFSRS adapts to your individual learning patterns—response speed, consistency, and review history determine when each word appears again. Complete Due reviews daily to maintain spacing intervals. Missing even a few days creates backlogs that disrupt the algorithm's effectiveness.",
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
    ],
  },
  {
    name: FAQCategoryEnum.LEARNING_APPROACH,
    items: [
      {
        id: 'how-learning-works',
        question: 'How does learning work here?',
        answer:
          'You read bilingual sentence pairs at 90-95% comprehension (i+1 level), with 5-10% new vocabulary per article. Tap unknown words to add them to spaced repetition. Regular reading builds pattern recognition without explicit grammar study.',
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
      {
        id: 'i-plus-one',
        question: 'What does i+1 mean?',
        answer:
          'Your current level (i) plus one step beyond (+1). Content at 90-95% comprehension—readable enough to understand context while introducing new vocabulary that you can deduce from surrounding text. This comprehension range drives language acquisition without overwhelming you.',
        category: FAQCategoryEnum.LEARNING_APPROACH,
      },
      {
        id: 'why-classical-texts',
        question: 'Why classical texts?',
        answer:
          'Classical texts contain the complete Arabic grammatical system and core vocabulary in authentic contexts. You acquire Arabic as native speakers use it—not simplified textbook approximations. Modern Standard Arabic is simplified classical Arabic, making the transition natural once you have built a classical foundation.',
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
          'Your account email, study vocabulary and review history, reading list, and app preferences. No ads. No third-party analytics. Diagnostics track app crashes to fix bugs.',
        category: FAQCategoryEnum.PRIVACY_DATA,
      },
    ],
  },
];
