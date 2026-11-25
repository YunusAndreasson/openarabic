import { Button, Divider, HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  minimumScaleFactor,
  padding,
  privacySensitive,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { widgetDesign } from '../constants/widgetEdition';
import type { WordFace } from './edition';

export function wordLayout(
  props: WordFace | null,
  env: WidgetEnvironment & { wordDesign?: typeof widgetDesign; accessibilityText?: boolean },
) {
  'widget';
  const design = env.wordDesign;
  if (!design || !props) return <VStack>{null}</VStack>;
  const { colors, layout: grid, labels } = design;
  const accessory = env.widgetFamily?.startsWith('accessory');
  const wide = env.widgetFamily === 'systemMedium';
  const fullColor = !env.widgetRenderingMode || env.widgetRenderingMode === 'fullColor';
  const night = env.colorScheme === 'dark' || env.isLuminanceReduced;
  const paper = night ? colors.darkPaper : colors.lightPaper;
  const ink = night ? colors.lightInk : colors.darkInk;
  const caption = night ? colors.lightCaption : colors.darkCaption;
  const actionInk = night ? colors.lightAccent : colors.forest;
  const well = night ? colors.darkWell : colors.lightWell;
  const accent = props.contextAccent?.[night ? 'dark' : 'light'] ?? actionInk;
  const personal = !!props.generation;
  const now = Date.now();
  const canReveal =
    !!props.gloss &&
    !props.due &&
    !(props.dueAt > 0 && now >= props.dueAt) &&
    !(props.expires > 0 && now >= props.expires);
  const revealed = canReveal && !!props.reveal;
  const link = (action: string) => {
    const params = [
      personal ? 'v=' + encodeURIComponent(props.generation) : '',
      props.passagePosition ? 'p=' + encodeURIComponent(props.passagePosition) : '',
      personal && props.rootId ? 'r=' + props.rootId : '',
      personal && props.articleId ? 'a=' + props.articleId : '',
      personal && props.sentenceId ? 's=' + props.sentenceId : '',
    ]
      .filter(Boolean)
      .join('&');
    return 'open-arabic:///widget/' + action + (params ? '?' + params : '');
  };
  const wordLink = link(
    props.rootId || props.passagePosition ? 'word' : personal ? 'practice' : 'read',
  );
  const passageLink = link(
    props.passagePosition || props.articleId ? 'passage' : personal ? 'practice' : 'read',
  );
  const chrome = [
    widgetURL(env.widgetFamily === 'accessoryInline' ? passageLink : wordLink),
    containerBackground(paper, 'widget'),
    privacySensitive(personal),
  ];
  const word = (
    <Text
      modifiers={[
        font({
          family: grid.fontFamily,
          size: accessory ? grid.lineSize : grid.heroSize - grid.gap * 2,
        }),
        ...(fullColor && !accessory ? [foregroundStyle(ink)] : []),
        lineLimit(1),
        minimumScaleFactor(0.44),
        layoutPriority(1),
      ]}
    >
      {props.arabic}
    </Text>
  );
  const response = revealed ? props.gloss : canReveal ? labels.reveal : props.status || labels.word;
  const responseLabel = (
    <Text
      modifiers={[
        font({ size: revealed ? grid.glossSize : grid.labelSize, weight: 'semibold' }),
        ...(fullColor && !accessory ? [foregroundStyle(revealed ? ink : actionInk)] : []),
        lineLimit(revealed || !canReveal ? 2 : 1),
        minimumScaleFactor(0.7),
        frame({ maxWidth: Infinity, minHeight: accessory ? 0 : grid.responseHeight }),
        ...(fullColor && !accessory ? [background(well), cornerRadius(grid.responseRadius)] : []),
      ]}
    >
      {response}
    </Text>
  );
  const control = canReveal ? (
    <Button
      target={'reveal-' + props.key}
      onPress={() => ({ ...props, reveal: !revealed })}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(revealed ? props.gloss + ', ' + labels.hide : labels.reveal),
      ]}
    >
      {responseLabel}
    </Button>
  ) : (
    responseLabel
  );

  if (env.widgetFamily === 'accessoryInline')
    return <Text modifiers={chrome}>{'\u2067' + props.arabic + '\u2069'}</Text>;
  if (env.widgetFamily === 'accessoryCircular')
    return (
      <VStack modifiers={chrome} spacing={0}>
        {word}
      </VStack>
    );
  if (accessory)
    return (
      <VStack modifiers={chrome} spacing={0}>
        {word}
        {control}
      </VStack>
    );

  const edition = (
    <Text
      modifiers={[
        font({ size: grid.labelSize, weight: 'semibold' }),
        ...(fullColor ? [foregroundStyle(actionInk)] : []),
        lineLimit(1),
        minimumScaleFactor(0.7),
      ]}
    >
      {props.kind}
    </Text>
  );
  const context = props.line ? (
    <Text
      modifiers={[
        font({ family: grid.fontFamily, size: grid.lineSize }),
        ...(fullColor ? [foregroundStyle(caption)] : []),
        lineLimit(1),
        minimumScaleFactor(0.55),
      ]}
    >
      {props.contextBefore !== undefined && props.contextAfter !== undefined ? (
        <>
          {props.contextBefore ? props.contextBefore + ' ' : ''}
          <Text modifiers={fullColor ? [foregroundStyle(accent)] : []}>{props.arabic}</Text>
          {props.contextAfter ? ' ' + props.contextAfter : ''}
        </>
      ) : (
        props.line
      )}
    </Text>
  ) : null;
  const hasSource = !!(props.passagePosition || props.articleId);
  if (wide && !env.accessibilityText)
    return (
      <HStack spacing={grid.wideInset} modifiers={chrome}>
        <VStack
          alignment="leading"
          spacing={grid.gap}
          modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' })]}
        >
          {edition}
          <Spacer minLength={0} />
          {control}
          {hasSource ? (
            <Link destination={passageLink} modifiers={[padding({ vertical: grid.gap })]}>
              <Text
                modifiers={[
                  font({ size: grid.labelSize }),
                  ...(fullColor ? [foregroundStyle(caption)] : []),
                  lineLimit(1),
                  minimumScaleFactor(0.7),
                ]}
              >
                {(props.credit || labels.passage) + labels.linkArrow}
              </Text>
            </Link>
          ) : null}
        </VStack>
        <Divider />
        <VStack
          alignment="trailing"
          spacing={grid.gap}
          modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'trailing' })]}
        >
          <Link destination={wordLink}>{word}</Link>
          {context}
        </VStack>
      </HStack>
    );

  return (
    <VStack alignment="leading" spacing={grid.gap} modifiers={chrome}>
      {!env.accessibilityText ? edition : null}
      <HStack spacing={0} modifiers={[frame({ maxWidth: Infinity })]}>
        <Spacer minLength={0} />
        {word}
      </HStack>
      {control}
    </VStack>
  );
}
