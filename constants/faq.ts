// FAQ data structure following Jakob's Law - familiar patterns from popular apps
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface FAQCategory {
  name: string;
  items: FAQItem[];
}

export const FAQ_DATA: FAQCategory[] = [
  {
    name: 'Getting Started',
    items: [
      {
        id: 'what-is-app',
        question: 'What is OpenArabic?',
        answer:
          'A free Arabic learning app based on classical Islamic texts. You read bilingual sentence pairs (an Arabic sentence followed by an English sentence), tap words you don’t understand, and add them to a spaced repetition system (FSRS) to learn over time.',
        category: 'Getting Started',
      },
      {
        id: 'is-this-a-course',
        question: 'Is OpenArabic a course?',
        answer:
          'No. OpenArabic is not a start‑to‑finish course. It is a bilingual reading and listening tool that complements your studies—use it alongside a course or after completing one.',
        category: 'Getting Started',
      },
      {
        id: 'who-is-this-for',
        question: 'Who is this for?',
        answer:
          'Learners who can decode Arabic and want to read real texts efficiently—especially those studying with a course or who just finished one and need vocabulary to read independently.',
        category: 'Getting Started',
      },
      {
        id: 'using-with-course',
        question: 'How should I use this with a course?',
        answer:
          'Pair your coursework with short authentic texts. Keep sessions light and regular to build reading stamina. After classes, continue reading to maintain momentum and grow vocabulary.',
        category: 'Getting Started',
      },
      {
        id: 'after-course-gap',
        question: "I finished a course but can't read books—what now?",
        answer:
          'OpenArabic bridges the post‑course vocabulary gap. Read longer texts with bilingual support, add missing words as you meet them, and gradually progress to more challenging material.',
        category: 'Getting Started',
      },
      {
        id: 'learning-speed',
        question: 'How quickly will I learn?',
        answer:
          'Pace depends on input volume and regularity. FSRS spaces reviews to the edge of forgetting: stable words surface rarely; weak words reappear sooner for efficient consolidation.',
        category: 'Getting Started',
      },
    ],
  },
  {
    name: 'Features',
    items: [
      {
        id: 'spaced-repetition',
        question: 'How does spaced repetition work?',
        answer:
          'We use FSRS to predict forgetting curves and schedule reviews just before recall drops. Your responses update stability and difficulty, dynamically adjusting intervals per word.',
        category: 'Features',
      },
      {
        id: 'article-selection',
        question: 'How are recommended articles selected?',
        answer:
          'The Featured section surfaces articles with mostly known vocabulary and a small, meaningful challenge (i+1). This keeps reading smooth while steadily growing your knowledge and balancing your due reviews.',
        category: 'Features',
      },
      {
        id: 'word-difficulty',
        question: 'How is word difficulty determined?',
        answer:
          'Difficulty emerges from your review history: response quality, stability, and elapsed time. FSRS uses these signals to adapt intervals; there are no arbitrary “levels.”',
        category: 'Features',
      },
      {
        id: 'audio-features',
        question: 'What audio features are available?',
        answer:
          'Audio playback with mini-player controls, sleep timer, and bookmarks management. Audio caches after you play an article the first time for offline listening. Controls emphasize Play and Stop for clarity.',
        category: 'Features',
      },
    ],
  },
  {
    name: 'Offline & storage',
    items: [
      {
        id: 'offline-mode',
        question: 'Does this work offline?',
        answer:
          'Partially. Cached audio and previously loaded content play offline; vocabulary reviews work offline as well. Sync (e.g., new words, progress) needs a connection.',
        category: 'Offline & storage',
      },
    ],
  },
  {
    name: 'Learning approach',
    items: [
      {
        id: 'how-learning-works',
        question: 'How does learning work here?',
        answer:
          'You read bilingual sentence pairs that you mostly understand, with a few new items in each article. Tap unknown words to add them to spaced repetition. Steady reading builds patterns without memorizing rules.',
        category: 'Learning approach',
      },
      {
        id: 'i-plus-one',
        question: 'What does i+1 mean?',
        answer:
          'Your current level (i) plus a small step (+1). Content stays readable while gently pushing growth.',
        category: 'Learning approach',
      },
      {
        id: 'why-classical-texts',
        question: 'Why classical texts?',
        answer:
          'They build accurate Arabic patterns and core vocabulary from the source, and make moving to modern formal Arabic straightforward.',
        category: 'Learning approach',
      },
      {
        id: 'scope',
        question: 'What’s the scope of this app?',
        answer:
          'It’s a language tool for reading and vocabulary. For theological guidance, consult qualified scholars and reliable references.',
        category: 'Learning approach',
      },
    ],
  },
  {
    name: 'Privacy & data',
    items: [
      {
        id: 'privacy-data',
        question: 'What data do you store?',
        answer:
          'Your account email, study items and review history, reading list, and basic settings. No ads and no third‑party analytics; diagnostics are minimal and used only to improve reliability.',
        category: 'Privacy & data',
      },
    ],
  },
];

// Helper function to get all FAQ items flattened
export const getAllFAQItems = (): FAQItem[] => {
  return FAQ_DATA.flatMap(category => category.items);
};

// Helper function to get FAQ items by category
export const getFAQItemsByCategory = (categoryName: string): FAQItem[] => {
  const category = FAQ_DATA.find(cat => cat.name === categoryName);
  return category?.items || [];
};

// Helper function to get FAQ item by ID
export const getFAQItemById = (id: string): FAQItem | undefined => {
  return getAllFAQItems().find(item => item.id === id);
};
