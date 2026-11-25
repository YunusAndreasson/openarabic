import { createWidget } from 'expo-widgets';
import { wordLayout } from './wordLayout';
import { widgetDesign } from '../constants/widgetEdition';
import { initialFace, type WordFace } from './edition';
export const publicWidget = createWidget<WordFace & { design?: typeof widgetDesign }>(
  'OpenText',
  wordLayout,
  { ...initialFace, design: widgetDesign },
);
