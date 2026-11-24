import { Button, Divider, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  privacySensitive,
  widgetURL,
  clipped,
  resizable,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';
import type { WordFace } from './edition';

export function wordLayout(props: WordFace, env: WidgetEnvironment & { cover?: string }) {
  'widget';
  const accessory = env.widgetFamily?.startsWith('accessory');
  const fullColor = !env.widgetRenderingMode || env.widgetRenderingMode === 'fullColor';
  const wide = env.widgetFamily === 'systemMedium';
  const night = env.colorScheme === 'dark' || env.isLuminanceReduced;
  const paper = night ? '#192b22' : wide ? '#f2f7f4' : '#145735';
  const ink = night || !wide ? '#fcfffd' : '#1a2b23';
  const faded = night || !wide ? '#e1ebe4' : '#4a5b52';
  const personal = !!props.generation;
  const revealed =
    !!props.reveal &&
    !props.due &&
    !(props.dueAt > 0 && Date.now() >= props.dueAt) &&
    !(props.expires > 0 && Date.now() >= props.expires);
  const canReveal = !props.due && (!props.dueAt || Date.now() < props.dueAt);
  const url = widgetURL(
    personal
      ? 'open-arabic:///widget/practice?v=' + props.generation
      : 'open-arabic:///widget/read',
  );
  const chrome = [url, containerBackground(paper, 'widget'), privacySensitive(personal)];
  const eyebrow = [font({ size: 12, weight: 'medium' }), foregroundStyle(faded), lineLimit(1)];
  const arabic = [
    font({ family: 'NotoSansArabic-Regular', size: accessory ? 20 : wide ? 31 : 42 }),
    foregroundStyle(ink),
    lineLimit(1),
    minimumScaleFactor(0.48),
  ];
  const word = <Text modifiers={arabic}>{props.arabic}</Text>;
  const control = canReveal ? (
    <Button
      target={'reveal-' + props.key}
      onPress={() => ({ ...props, reveal: !props.reveal })}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(
          revealed ? props.arabic + ', ' + props.gloss : props.arabic + ', Reveal meaning',
        ),
      ]}
    >
      {word}
    </Button>
  ) : (
    word
  );
  if (env.widgetFamily === 'accessoryInline')
    return <Text modifiers={chrome}>{'\u2067' + props.arabic + '\u2069'}</Text>;
  if (env.widgetFamily === 'accessoryCircular')
    return (
      <VStack modifiers={chrome}>
        {control}
        {revealed ? <Text modifiers={eyebrow}>{props.gloss}</Text> : null}
      </VStack>
    );
  if (accessory)
    return (
      <VStack alignment="leading" spacing={0} modifiers={chrome}>
        {control}
        <Text modifiers={eyebrow}>{revealed ? props.gloss : 'Open text'}</Text>
      </VStack>
    );
  return (
    <HStack spacing={12} modifiers={chrome}>
      {wide && props.credit ? (
        <VStack spacing={3}>
          {props.illustrated && fullColor && env.cover ? (
            <Image
              uiImage={env.cover}
              modifiers={[resizable(), frame({ width: 78, height: 84 }), clipped()]}
            />
          ) : null}
          <Text modifiers={[font({ size: 11 }), foregroundStyle(faded), lineLimit(2)]}>
            {props.credit}
          </Text>
        </VStack>
      ) : null}

      <VStack
        alignment="leading"
        spacing={3}
        modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
      >
        <Text modifiers={eyebrow}>{props.kind}</Text>
        {wide && props.line ? (
          <Text
            modifiers={[
              font({ family: 'NotoSansArabic-Regular', size: 19 }),
              foregroundStyle(ink),
              lineLimit(1),
              minimumScaleFactor(0.55),
            ]}
          >
            {props.line}
          </Text>
        ) : null}
        <HStack>
          <Spacer minLength={0} />
          {control}
        </HStack>
        {revealed ? (
          <Text
            modifiers={[
              font({ size: 16, weight: 'semibold' }),
              foregroundStyle(ink),
              lineLimit(2),
              minimumScaleFactor(0.75),
            ]}
          >
            {props.gloss}
          </Text>
        ) : null}
        <Spacer minLength={0} />
        <Divider />
        <Text modifiers={eyebrow}>{props.status}</Text>
      </VStack>
    </HStack>
  );
}
