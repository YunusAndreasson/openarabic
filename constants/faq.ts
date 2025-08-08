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
          'A free Arabic learning app focused on reading authentic classical texts with precise translations and science-backed spaced repetition (FSRS) for durable vocabulary growth.',
        category: 'Getting Started',
      },
      {
        id: 'is-free',
        question: 'Is it free?',
        answer:
          'Yes. No ads, no subscriptions. Built as a public good by Yûnus Andréasson (yunus@edenmind.com).',
        category: 'Getting Started',
      },
      {
        id: 'who-is-this-for',
        question: 'Who is this for?',
        answer:
          'Learners who can decode Arabic and want to read real texts efficiently. You tap unknown words to add them, then the app schedules optimal reviews to convert them into long‑term memory.',
        category: 'Getting Started',
      },
      {
        id: 'how-to-start',
        question: 'How do I get started?',
        answer:
          'Open Library, pick an article, tap words to see meanings, then add unfamiliar words to your study list. Use Study to review with FSRS. Add gradually; prioritize due reviews before adding more.',
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
        id: 'memory-gauge',
        question: 'What is the Memory Gauge?',
        answer:
          'A quick capacity signal derived from your due load and weak items. Green: room for new words. Yellow: reinforce struggling words. Red: clear due reviews first to restore capacity.',
        category: 'Features',
      },
      {
        id: 'word-highlighting',
        question: 'Why are some words highlighted together?',
        answer:
          'Arabic morphology can map to multi‑word English phrases. We color‑link Arabic components to English only when the English side has multiple words and exact matches. Single‑word translations are never color‑coded.',
        category: 'Features',
      },
      {
        id: 'study-reminders',
        question: 'How do study reminders work?',
        answer:
          'Account → Study reminders → enable and set a time. Notifications are local to your device. You can disable them anytime.',
        category: 'Features',
      },
      {
        id: 'audio-features',
        question: 'What audio features are available?',
        answer:
          'A focused now‑playing experience with sleep timer, playlist management, and progress tracking. Audio caches automatically for offline playback once downloaded. Controls emphasize Play/Stop for clarity.',
        category: 'Features',
      },
      {
        id: 'article-selection',
        question: 'How are recommended articles selected?',
        answer:
          'We target i+1 difficulty: mostly known vocabulary with a small, meaningful challenge. Selection balances your study load (due words) with variety for sustained progress.',
        category: 'Features',
      },
      {
        id: 'word-difficulty',
        question: 'How is word difficulty determined?',
        answer:
          'Difficulty emerges from your review history: response quality, stability, and elapsed time. FSRS uses these signals to adapt intervals; there are no arbitrary “levels.”',
        category: 'Features',
      },
    ],
  },
  {
    name: 'Offline & storage',
    items: [
      {
        id: 'audio-cache',
        question: 'What is audio cache?',
        answer:
          'Downloaded audio stored locally for offline playback. Manage it in Account → Audio cache. Clearing it frees space; tracks re‑download on demand.',
        category: 'Offline & storage',
      },
      {
        id: 'offline-mode',
        question: 'Does this work offline?',
        answer:
          'Partially. Cached audio and previously loaded content play offline; vocabulary reviews work offline as well. Sync (e.g., new words, progress) needs a connection.',
        category: 'Offline & storage',
      },
      {
        id: 'app-structure',
        question: 'How is the app organized?',
        answer:
          'Library: read articles. Playlist: listen with timer and queue. Study: spaced‑repetition reviews. Account: fonts, theme, notifications, and cache management.',
        category: 'Offline & storage',
      },
    ],
  },
  {
    name: 'Learning approach',
    items: [
      {
        id: 'why-classical-texts',
        question: 'Why classical texts?',
        answer:
          'Classical Arabic underpins grammar, style, and core vocabulary. Reading source texts develops accurate patterns while connecting you to the Islamic literary tradition.',
        category: 'Learning approach',
      },
      {
        id: 'theology-disclaimer',
        question: 'Is this for theology questions?',
        answer:
          'No. It is a language tool. For fiqh or creed questions, consult qualified scholars and reliable references.',
        category: 'Learning approach',
      },
      {
        id: 'comprehensible-input',
        question: 'What is comprehensible input?',
        answer:
          'Input that is mostly understood with minimal effort, containing a manageable number of new items. This supports natural acquisition via context and repetition rather than explicit rule memorization.',
        category: 'Learning approach',
      },
      {
        id: 'i-plus-one',
        question: 'What does i+1 mean?',
        answer:
          'Your current competence (i) plus a small incremental challenge (+1). Content stays readable while nudging growth; it should feel engaging, not exhausting.',
        category: 'Learning approach',
      },
      {
        id: 'natural-acquisition',
        question: 'How does natural acquisition work?',
        answer:
          'Through meaningful exposure: your brain internalizes patterns from messages you understand. You need sustained input and well‑timed retrieval, not grammar drills alone.',
        category: 'Learning approach',
      },
      {
        id: 'why-90-percent',
        question: 'Why 90-95% familiar words?',
        answer:
          'It maximizes comprehension while introducing just enough novelty to learn from context. Below ~90% becomes decoding practice; above ~95% slows growth.',
        category: 'Learning approach',
      },
      {
        id: 'affective-filter',
        question: 'What is the affective filter?',
        answer:
          'Emotional state affects intake. Calm, focused sessions improve acquisition; stress reduces it. The design intentionally avoids pressure and interruption.',
        category: 'Learning approach',
      },
      {
        id: 'input-vs-output',
        question: 'Why focus on reading/listening?',
        answer:
          'Acquisition is input‑driven: you build competence by understanding messages. Output stabilizes once the internal system is ready; forcing it early is inefficient.',
        category: 'Learning approach',
      },
      {
        id: 'natural-order',
        question: 'How does the natural order work?',
        answer:
          'Features are internalized in a fairly robust sequence, independent of syllabus order. The app respects this by emphasizing abundant, level‑appropriate input.',
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
