import { Box, Button, Column, Row, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  height,
  padding,
  paddingAll,
  size,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { widgetDesign } from '../constants/widgetEdition';
import { initialFace, type WordFace } from './edition';

type AndroidFace = WordFace & {
  frames?: { at: number; face: WordFace }[];
  publicRotation?: { firstUse: number; faces: WordFace[] };
  design?: typeof widgetDesign;
};

function layout(
  face: AndroidFace | null,
  env: WidgetEnvironment & {
    seed?: AndroidFace;
    wordRevealed?: boolean;
    wordCanReveal?: boolean;
    widthDp?: number;
    heightDp?: number;
    fontScale?: number;
  },
) {
  'widget';
  const data = face ?? env.seed;
  const design = env.seed?.design;
  if (!data || !design) return <Column />;

  const { colors, layout: grid, labels } = design;
  const width = env.widthDp ?? grid.compactWidth;
  const heightDp = env.heightDp ?? grid.defaultHeight;
  const fontScale = env.fontScale ?? 1;
  const largeText = fontScale >= 1.6;
  const wide = width >= grid.wideWidth && heightDp >= grid.defaultHeight && !largeText;
  const intermediate = width >= grid.intermediateWidth;
  const inset = wide ? grid.wideInset : grid.inset;
  const usableWidth = Math.max(1, Math.floor(width - 2 * inset));
  const usableHeight = heightDp - 2 * inset;
  const labelHeight = Math.ceil(grid.labelHeight * fontScale);
  const night = env.colorScheme === 'dark';
  const paper = night ? colors.darkPaper : colors.lightPaper;
  const ink = night ? colors.lightInk : colors.darkInk;
  const caption = night ? colors.lightCaption : colors.darkCaption;
  const actionInk = night ? colors.lightAccent : colors.forest;
  const well = night ? colors.darkWell : colors.lightWell;
  const accent = data.contextAccent?.[night ? 'dark' : 'light'] ?? actionInk;

  const canReveal = !!env.wordCanReveal;
  const revealed = canReveal && !!env.wordRevealed;
  // Reserve space for both lines at the larger gloss size so revealing a word
  // keeps the action in place. Spend the available height on the readable text
  // and keep a minimum area for the Arabic word.
  const scaledResponseHeight = Math.ceil(
    grid.responseLines * labelHeight * (grid.glossSize / grid.labelSize),
  );
  const responseHeight = largeText
    ? Math.max(
        grid.responseHeight,
        Math.min(scaledResponseHeight, usableHeight - grid.minimumHeroHeight - grid.gap),
      )
    : grid.responseHeight;
  const hasSource = !!(data.passagePosition || data.articleId);
  const showSource =
    hasSource && (wide || (intermediate && !largeText && heightDp >= grid.defaultHeight));
  const showEdition = wide || (!largeText && heightDp >= grid.compactWidth);
  const columnGap = grid.wideInset;
  const sidebar = Math.floor((usableWidth - columnGap) * grid.sidebarFraction);
  const arabicWidth = wide ? usableWidth - columnGap - sidebar : usableWidth;
  const showLine = wide && !!data.line;
  const heroHeight = Math.max(
    grid.minimumHeroHeight,
    wide
      ? usableHeight - (showLine ? grid.contextHeight : 0)
      : usableHeight -
          responseHeight -
          (showEdition ? labelHeight : 0) -
          (showSource ? grid.sourceHeight : 0) -
          grid.gap,
  );

  const edition = showEdition ? (
    <Text color={actionInk} maxLines={1} style={{ fontSize: grid.labelSize, fontWeight: '600' }}>
      {data.kind}
    </Text>
  ) : null;
  const word = (
    <Button {...{ target: 'word' }} modifiers={[fillMaxWidth(), height(heroHeight)]}>
      <Box>
        <Text
          color={ink}
          modifiers={[size(arabicWidth, heroHeight)]}
          style={{ fontFamily: grid.fontFamily, fontSize: grid.heroSize, textAlign: 'right' }}
        >
          {data.arabic}
        </Text>
      </Box>
    </Button>
  );
  const response = (
    <Button
      {...{ target: canReveal ? 'reveal' : 'word' }}
      modifiers={[
        fillMaxWidth(),
        height(responseHeight),
        background(well),
        cornerRadius(grid.responseRadius),
      ]}
    >
      <Box modifiers={[fillMaxSize(), padding(grid.gap, 0, grid.gap, 0)]} contentAlignment="center">
        <Text
          color={revealed ? ink : actionInk}
          maxLines={grid.responseLines}
          style={{
            fontSize: revealed ? grid.glossSize : grid.labelSize,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {revealed ? data.gloss : canReveal ? labels.reveal : data.status || labels.word}
        </Text>
      </Box>
    </Button>
  );
  const source = showSource ? (
    <Button {...{ target: 'passage' }} modifiers={[fillMaxWidth(), height(grid.sourceHeight)]}>
      <Box modifiers={[fillMaxSize()]} contentAlignment="centerStart">
        <Text color={caption} maxLines={1} style={{ fontSize: grid.labelSize }}>
          {(data.credit || labels.passage) + labels.linkArrow}
        </Text>
      </Box>
    </Button>
  ) : null;
  const context = showLine ? (
    <Text
      color={caption}
      modifiers={[size(arabicWidth, grid.contextHeight)]}
      style={{ fontFamily: grid.fontFamily, fontSize: grid.lineSize, textAlign: 'right' }}
    >
      {data.contextBefore !== undefined && data.contextAfter !== undefined ? (
        <>
          {data.contextBefore ? data.contextBefore + ' ' : ''}
          <Text color={accent}>{data.arabic}</Text>
          {data.contextAfter ? ' ' + data.contextAfter : ''}
        </>
      ) : (
        data.line
      )}
    </Text>
  ) : null;
  const surface = [fillMaxSize(), background(paper), paddingAll(inset)];
  if (wide)
    return (
      <Row modifiers={surface}>
        <Column modifiers={[size(sidebar, usableHeight)]}>
          {edition}
          <Box
            modifiers={[
              fillMaxWidth(),
              height(
                Math.max(
                  0,
                  usableHeight -
                    labelHeight -
                    responseHeight -
                    (showSource ? grid.sourceHeight : 0),
                ),
              ),
            ]}
          />
          {response}
          {source}
        </Column>
        <Box modifiers={[size(columnGap, usableHeight)]} />
        <Column modifiers={[size(arabicWidth, usableHeight)]}>
          {word}
          {context}
        </Column>
      </Row>
    );
  return (
    <Column modifiers={surface}>
      {edition}
      {word}
      {response}
      {source}
    </Column>
  );
}

export const wordWidget = createWidget<AndroidFace>('WordInContext', layout, {
  ...initialFace,
  design: widgetDesign,
});
