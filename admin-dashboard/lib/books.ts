export interface Book {
  slug: string;
  title: string;
  titleArabic: string;
  author: string;
  authorArabic: string;
  description: string;
  pages: number;
  fileUrl: string;
  fileSizeMb: number;
  /** Authoritative reference for the author (used for citation + JSON-LD sameAs). */
  authorWikipedia?: string;
}

export const BOOKS: Book[] = [
  {
    slug: 'al-fawaid',
    title: 'Al-Fawaid',
    titleArabic: 'الفوائد',
    author: 'Ibn al-Qayyim al-Jawziyya',
    authorArabic: 'ابن قيّم الجوزيّة',
    description:
      'A bilingual Arabic–English edition of "The Benefits" — spiritual reflections on faith, the heart, and the path to God. Learner-friendly translation preserving Arabic word order.',
    pages: 308,
    fileUrl: '/books/al-fawaid.pdf',
    fileSizeMb: 18,
    authorWikipedia: 'https://en.wikipedia.org/wiki/Ibn_Qayyim_al-Jawziyya',
  },
];
