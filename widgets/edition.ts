import { initialFace } from '../constants/widgetEdition';
export { initialFace };
export type WordFace = typeof initialFace & { occurrenceKey?: string };
export interface WordEntry {
  date: Date;
  props: WordFace;
}
