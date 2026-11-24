import { createWidget } from 'expo-widgets';
import { wordLayout } from './wordLayout';
import { initialFace } from './edition';
export const publicWidget = createWidget('OpenText', wordLayout, initialFace);
