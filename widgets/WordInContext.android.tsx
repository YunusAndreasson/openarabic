import { Button, Column, Image, Row, Text } from '@expo/ui/jetpack-compose';
import { background, fillMaxSize, paddingAll, size } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { widgetColors } from '../constants/widgetEdition';
import { initialFace, type WordFace } from './edition';

type AndroidFace = WordFace & {
  palette?: typeof widgetColors;
  frames?: { at: number; face: WordFace }[];
};
function layout(
  raw: AndroidFace | null,
  env: WidgetEnvironment & {
    seed?: WordFace & { palette: typeof widgetColors };
    wordRevealed?: boolean;
    widthDp?: number;
    heightDp?: number;
    fontScale?: number;
  },
) {
  'widget';
  // The protected-owner fallback can run before the containing app ever opens.
  const now = Date.now();
  const active = raw?.frames?.filter(entry => entry.at <= now).pop()?.face ?? raw;
  const data =
    active?.arabic && (!active.expires || active.expires > now) ? active : (env.seed ?? raw);
  const palette = env.seed?.palette ?? raw?.palette;
  if (!palette || !data) return <Column />;
  const canReveal = data === active && !data.due && (!data.dueAt || now < data.dueAt);
  const showGloss = canReveal && env.wordRevealed === true;
  const prompt = canReveal && !!data.generation && !showGloss;
  const width = env.widthDp ?? 130;
  const scale = env.fontScale ?? 1;
  const wide = width >= 296 && scale < 1.6;
  const intermediate = width >= 208 && !wide && scale < 1.5;
  const night = env.colorScheme === 'dark';
  const paper = night ? palette.darkPaper : wide ? palette.lightPaper : palette.forest;
  const ink = night || !wide ? palette.lightInk : palette.darkInk;
  const caption = night || !wide ? palette.lightCaption : palette.darkCaption;
  // Android's Glance adapter supports system text. Arabic must stay in a single
  // shaped run; reserve the full row before adding the optional source image.
  const letters = data.arabic.replace(/[\u064b-\u065f\u0670]/g, '').length;
  const height = env.heightDp ?? 150;
  const photo = wide && data.illustrated && height >= 112 && scale < 1.3;
  const inset = 12;
  const panelWidth = photo ? 82 : 0;
  const textWidth = Math.max(60, width - inset * 2 - panelWidth);
  const arabicSize = Math.min(wide ? 36 : 40, textWidth / (Math.max(letters, 3) * 0.8 * scale));
  const word = (
    <Text color={ink} style={{ fontSize: arabicSize, fontFamily: 'sansSerif' }} maxLines={1}>
      {data.arabic}
    </Text>
  );
  return (
    <Row modifiers={[fillMaxSize(), background(paper)]} verticalAlignment="center">
      {photo ? (
        <Column modifiers={[size(panelWidth, height), background(palette.darkPaper)]}>
          <Image
            source={{ uri: 'word_widget_books' }}
            contentDescription={null}
            modifiers={[size(panelWidth, height - 42)]}
          />
          {showGloss ? (
            <Text color={palette.lightInk} style={{ fontSize: 12 }} maxLines={2}>
              {data.credit}
            </Text>
          ) : null}
        </Column>
      ) : null}
      <Column modifiers={[fillMaxSize(), paddingAll(inset)]} verticalAlignment="center">
        {(showGloss || prompt) && scale < 1.6 && height >= 104 ? (
          <Text color={caption} style={{ fontSize: 12 }} maxLines={1}>
            {prompt ? 'Practice word' : data.kind}
          </Text>
        ) : null}
        {(wide || intermediate) && data.line ? (
          <Text color={ink} style={{ fontSize: 19, fontFamily: 'sansSerif' }} maxLines={1}>
            {data.line}
          </Text>
        ) : null}
        {canReveal ? (
          <Button>
            <Column>
              {word}
              {prompt ? (
                <Text color={caption} style={{ fontSize: 12 }} maxLines={1}>
                  Reveal meaning
                </Text>
              ) : null}
            </Column>
          </Button>
        ) : (
          word
        )}
        {showGloss && data.gloss ? (
          <Text color={ink} style={{ fontSize: 14 }} maxLines={2}>
            {data.gloss}
          </Text>
        ) : null}
        {showGloss && !photo && (wide || intermediate) && !!data.credit ? (
          <Text color={caption} style={{ fontSize: 12 }} maxLines={1}>
            {data.credit}
          </Text>
        ) : null}
        {showGloss && scale < 1.6 && height >= 104 ? (
          <Text color={caption} style={{ fontSize: 12 }} maxLines={2}>
            {data.status}
          </Text>
        ) : null}
      </Column>
    </Row>
  );
}
export const wordWidget = createWidget<AndroidFace>('WordInContext', layout, {
  ...initialFace,
  palette: widgetColors,
});
