import { STRINGS } from './strings';

// The binary registry runs before Metro or the app. Keep this public initial
// face property-list safe. The passage contract test verifies the exact occurrence.
export const initialFace = {
  arabic: 'كَنْزٍ',
  gloss: 'a treasure',
  line: 'وَقَعْتُ عَلَى كَنْزٍ',
  credit: 'Ibn al-Jawzī',
  kind: STRINGS.WIDGET_OPEN_TEXT as string,
  status: STRINGS.WIDGET_READ_LINE as string,
  generation: '',
  key: 'public-59291',
  passagePosition: '0.8',
  reveal: false,
  due: false,
  checked: 0,
  dueAt: 0,
  expires: 0,
  illustrated: true,
};

const widgetColors = {
  darkPaper: '#192b22',
  lightPaper: '#f2f7f4',
  forest: '#145735',
  lightInk: '#fcfffd',
  darkInk: '#1a2b23',
  lightCaption: '#e1ebe4',
  darkCaption: '#4a5b52',
  lightWell: '#e1ebe4',
  darkWell: '#2b3c35',
  lightAccent: '#9ab5a4',
};

// The embedded registry stubs React Native, so widget geometry lives here.
// Insets follow the app's 4-point spacing grid.
const widgetLayout = {
  compactWidth: 130,
  defaultHeight: 150,
  intermediateWidth: 208,
  wideWidth: 296,
  inset: 12,
  wideInset: 16,
  gap: 4,
  responseRadius: 10,
  heroSize: 56,
  minimumHeroHeight: 24,
  sidebarFraction: 0.4,
  responseHeight: 44,
  responseLines: 2,
  sourceHeight: 24,
  labelHeight: 18,
  contextHeight: 36,
  lineSize: 24,
  labelSize: 13,
  glossSize: 16,
  fontFamily: 'Amiri-Regular',
};

const widgetLabels = {
  reveal: STRINGS.WIDGET_REVEAL,
  hide: STRINGS.WIDGET_HIDE,
  passage: STRINGS.WIDGET_READ_LINE,
  word: STRINGS.WIDGET_OPEN_WORD,
  linkArrow: ' ↗',
};

export const widgetDesign = { colors: widgetColors, layout: widgetLayout, labels: widgetLabels };
