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
          'A free Arabic learning app. Read classical Islamic texts with translations and build vocabulary through spaced repetition.',
        category: 'Getting Started',
      },
      {
        id: 'is-free',
        question: 'Is it free?',
        answer:
          'Yes, completely free with no ads or subscriptions. Created by Yûnus Andréasson (yunus@edenmind.com) for everyone.',
        category: 'Getting Started',
      },
      {
        id: 'who-is-this-for',
        question: 'Who is this for?',
        answer:
          'Readers who can recognize Arabic letters and basic words but struggle with full texts. Add unknown words to your study list and memorize them.',
        category: 'Getting Started',
      },
      {
        id: 'how-to-start',
        question: 'How do I get started?',
        answer:
          'Go to Read tab, choose an article, tap Arabic words to see translations, then tap the school icon to add words to your study list. Use Practice tab to review with spaced repetition.',
        category: 'Getting Started',
      },
      {
        id: 'learning-speed',
        question: 'How quickly will I learn?',
        answer:
          'Learning speed varies by individual. The FSRS algorithm optimizes review timing - words you know well appear less often, difficult words more frequently.',
        category: 'Getting Started',
      },
    ],
  },
  {
    name: 'Design Philosophy',
    items: [
      {
        id: 'why-simple',
        question: 'Why is the interface so simple?',
        answer:
          'Minimalism puts content first. Removing distracting features is as important as adding new ones. Every element serves your Arabic learning.',
        category: 'Design Philosophy',
      },
      {
        id: 'what-makes-different',
        question: 'What makes this different?',
        answer:
          'Designed for the perfect experience reading classical Arabic texts, even without full fluency. Clean interface, authentic literature, smart learning.',
        category: 'Design Philosophy',
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
          'Uses the FSRS algorithm to show words just before you forget them. Good answers = longer intervals, difficult words = more frequent practice.',
        category: 'Features',
      },
      {
        id: 'memory-gauge',
        question: 'What is the Memory Gauge?',
        answer:
          'Shows your learning capacity in Practice tab. Green = ready for new words, Yellow = practice struggling words, Red = review due words first.',
        category: 'Features',
      },
      {
        id: 'word-highlighting',
        question: 'Why are some words highlighted together?',
        answer:
          'Arabic words can combine multiple English meanings. Color-coding shows prefixes, suffixes, and components in multi-word translations only. Single words are never color-coded.',
        category: 'Features',
      },
      {
        id: 'study-reminders',
        question: 'How do study reminders work?',
        answer:
          "Go to Account → toggle Study reminders on → tap Time to set your preferred reminder time. You'll get daily notifications to practice.",
        category: 'Features',
      },
      {
        id: 'audio-features',
        question: 'What audio features are available?',
        answer:
          'Listen to articles with sleep timer, playlist management, and progress tracking. Audio downloads automatically and works offline once cached.',
        category: 'Features',
      },
    ],
  },
  {
    name: 'Content',
    items: [
      {
        id: 'why-classical-texts',
        question: 'Why classical texts?',
        answer:
          'Classical Arabic is the foundation. These texts teach proper grammar, vocabulary, and style while connecting you to Islamic literary heritage.',
        category: 'Content',
      },
      {
        id: 'theology-disclaimer',
        question: 'Is this for theology questions?',
        answer:
          'No, this is an Arabic language learning app. For detailed Islamic theology or jurisprudence, consult qualified scholars and traditional sources.',
        category: 'Content',
      },
      {
        id: 'article-recommendations',
        question: 'How are articles chosen for me?',
        answer:
          'Uses i+1 principle: 90-95% familiar words with just enough new vocabulary to challenge you. Perfect comprehensible input for natural learning.',
        category: 'Content',
      },
      {
        id: 'comprehensible-input',
        question: 'What is comprehensible input?',
        answer:
          'Language you can mostly understand (90-95%) with just a few new words. Like reading a story where you know most words but learn 2-3 new ones from context. This is how children naturally learn language.',
        category: 'Content',
      },
      {
        id: 'i-plus-one',
        question: 'What does i+1 mean?',
        answer:
          'Your current level (i) plus one step beyond (+1). Articles contain mostly familiar language with just enough new vocabulary to challenge you without overwhelming. This creates the perfect learning zone.',
        category: 'Content',
      },
      {
        id: 'natural-acquisition',
        question: 'How does natural acquisition work?',
        answer:
          'You absorb new words and grammar patterns by understanding messages, not memorizing rules. Like how you learned your first language - through meaningful exposure, not textbooks.',
        category: 'Content',
      },
    ],
  },
  {
    name: 'Technical',
    items: [
      {
        id: 'audio-cache',
        question: 'What is audio cache?',
        answer:
          'Downloaded audio files stored on your device for offline playback. Go to Account → Audio cache → Clear to free up storage space.',
        category: 'Technical',
      },
      {
        id: 'clear-cache',
        question: 'How do I clear audio cache?',
        answer:
          'Account settings → Audio cache → Clear. Audio will re-download when needed. This frees up device storage space.',
        category: 'Technical',
      },
      {
        id: 'offline-mode',
        question: 'Does this work offline?',
        answer:
          'Partially. Downloaded articles, cached audio, and vocabulary practice work offline. Adding new words or syncing progress requires internet connection.',
        category: 'Technical',
      },
      {
        id: 'app-structure',
        question: 'How is the app organized?',
        answer:
          'Read tab: Browse and read articles. Listen tab: Audio playlist with sleep timer. Practice tab: Vocabulary review with spaced repetition. Account: Settings and preferences.',
        category: 'Technical',
      },
    ],
  },
  {
    name: 'Learning Science',
    items: [
      {
        id: 'why-90-percent',
        question: 'Why 90-95% familiar words?',
        answer:
          'Research shows this is the sweet spot for learning. Too easy (100%) = no progress. Too hard (below 90%) = overwhelming. 90-95% lets you understand while picking up new language naturally.',
        category: 'Learning Science',
      },
      {
        id: 'affective-filter',
        question: 'What is the affective filter?',
        answer:
          'Your mental state affects learning. When relaxed and motivated, you absorb language easily. When stressed or anxious, learning slows down. The app creates a calm, focused environment.',
        category: 'Learning Science',
      },
      {
        id: 'input-vs-output',
        question: 'Why focus on reading/listening?',
        answer:
          'Input (reading/listening) drives language acquisition. You learn by understanding messages, not by forcing yourself to speak. Speaking naturally emerges once you have enough input.',
        category: 'Learning Science',
      },
      {
        id: 'natural-order',
        question: 'How does the natural order work?',
        answer:
          'Your brain acquires language features in a predictable sequence, regardless of how you study. The app works with this natural order, not against it.',
        category: 'Learning Science',
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
