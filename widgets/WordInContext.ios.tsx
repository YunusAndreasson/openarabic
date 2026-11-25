import { createWidget } from 'expo-widgets';
import { wordLayout } from './wordLayout';
import { widgetDesign } from '../constants/widgetEdition';
import { initialFace, type WordFace } from './edition';
export const wordWidget = createWidget<WordFace & { design?: typeof widgetDesign }>(
  'WordInContext',
  wordLayout,
  { ...initialFace, design: widgetDesign },
);
