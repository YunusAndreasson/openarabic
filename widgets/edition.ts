import { initialFace } from '../constants/widgetEdition';
export { initialFace };
export type WordFace = Omit<typeof initialFace, 'passagePosition'> & {
  occurrenceKey?: string;
  passagePosition?: string;
  articleId?: number;
  sentenceId?: number;
  rootId?: number;
  contextBefore?: string;
  contextAfter?: string;
  contextAccent?: { light: string; dark: string };
};
export interface WordEntry {
  date: Date;
  props: WordFace;
}
