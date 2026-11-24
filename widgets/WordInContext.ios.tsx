import { createWidget } from 'expo-widgets';
import { wordLayout } from './wordLayout';
import { initialFace } from './edition';
export const wordWidget = createWidget('WordInContext', wordLayout, initialFace);
