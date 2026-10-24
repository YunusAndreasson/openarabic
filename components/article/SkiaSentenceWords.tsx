import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  PixelRatio,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import {
  useAnimatedReaction,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Canvas,
  Group,
  Paragraph as SkiaParagraph,
  Rect,
  Skia,
  type SkPaint,
  type SkParagraph,
} from 'react-native-skia';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/primitives/ThemedText';
import { BREATHE_EASING, BREATHE_HALF_PERIOD, TIMING_CONSTANTS } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useSkiaFonts } from '@/hooks/theme/useSkiaFonts';
import { useSkiaGpuAvailable } from '@/hooks/theme/useSkiaGpuAvailable';
import { useSentenceSelectedRoots } from '@/hooks/vocabulary/useSentenceSelectedRoots';
import type { RootId } from '@/types/branded.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { buildWordParagraph } from '@/utils/skiaParagraphBuilder';
import {
  layoutSentenceWords,
  measureSentenceWord,
  WORD_PADDING,
  type SentenceWordMetrics,
} from '@/utils/sentenceWordLayout';

/** The id type of the reader's `activeWordIdSV` (`ArticleSentenceProps`). */
type WordId = string | number;

let activeWordLayer: SkPaint | null = null;

/**
 * The layer paint that dims the word whose tooltip is open. A `Paragraph`
 * paints with its own text-style paints and ignores the canvas paint, so a
 * Group's `opacity` never reaches it; only a save-layer with an alpha paint
 * fades it. The layer is given to the active word alone: Skia 3 saves a layer
 * for any `layer` value it is handed, `false` included, and a layer on every
 * word would be one offscreen pass per word on every frame.
 */
const getActiveWordLayer = () => {
  if (!activeWordLayer) {
    activeWordLayer = Skia.Paint();
    activeWordLayer.setAlphaf(LAYOUT.OPACITY.HIGH);
  }
  return activeWordLayer;
};

export interface SkiaSentenceWordsProps {
  words: SentenceWord[];
  /** Tap: open the word's tooltip, anchored on the frame passed. */
  onWordPress?: (word: SentenceWord, layout: LayoutRectangle) => void;
  /** Long-press: instant save to practice (toggle) */
  onWordLongPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  /** Pulses the first word's marker to draw attention (the reader tutorial). */
  highlightFirstWord?: boolean;
  /** SharedValue tracking the active word ID (the open tooltip); dims that word. */
  activeWordIdSV?: SharedValue<WordId | null>;
  /** Root to mark as the looked-up word (dictionary sentence examples). */
  highlightRootId?: RootId | null;
  /** Screen-level selection snapshot. Omit and the sentence subscribes itself. */
  selectedRootIds?: ReadonlySet<number>;
}

interface SentenceWordsInternalProps extends SkiaSentenceWordsProps {
  selectedRootIds: ReadonlySet<number>;
}

/**
 * The marker under a word. Its three "this word is notable" states share one
 * visual channel, a thin rule, and differ only in weight and motion. Ranking
 * them into a single height makes them mutually exclusive, so a saved word that
 * is also the dictionary target draws one line, never a doubled one.
 */
const getMarkerHeight = (isHighlighted: boolean, isTarget: boolean, isSelected: boolean) => {
  if (isHighlighted || isTarget) {
    return LAYOUT.BORDER.WIDTH.FOCUSED;
  }
  return isSelected ? LAYOUT.BORDER.WIDTH.NORMAL : 0;
};

/**
 * A sentence's Arabic words, painted on ONE Skia canvas.
 *
 * Every word used to be its own `<Canvas>`. Under Skia 3 a canvas is a native
 * Graphite view with its own GPU surface, and a long article mounted hundreds
 * of them. Here each word keeps its own paragraph and the exact box it had
 * (`measureSentenceWord`), but the words are placed in JS by the same rules the
 * flex row used (`layoutSentenceWords`) and drawn together:
 *
 * - React records the sentence once per commit. Saving a word re-renders one
 *   sentence, which means one re-record.
 * - The tutorial pulse is a shared value: Skia's UI runtime applies it to the
 *   recorded scene, with no React commit and no re-record. The active-word dim
 *   is a save-layer, so opening a tooltip re-records the one sentence it opens
 *   in (`getActiveWordLayer`).
 * - The taps stay native: one transparent Pressable per word sits over its
 *   box, carrying the press, long-press, tooltip measurement and screen-reader
 *   label each word had before. These are plain views with no GPU surface.
 *
 * Without a GPU (`useSkiaGpuAvailable`), the words fall back to plain Text in a
 * flex row: one span per word joins correctly, and only the grammar colours
 * are lost.
 */
const SentenceWordsInternal = function SkiaSentenceWords({
  words,
  onWordPress,
  onWordLongPress,
  highlightFirstWord = false,
  activeWordIdSV,
  highlightRootId,
  selectedRootIds,
}: SentenceWordsInternalProps) {
  const colors = useColors();
  const gpuAvailable = useSkiaGpuAvailable();
  const { fontSize, fontFamily, fontManager } = useSkiaFonts();

  const blockRef = useRef<ComponentRef<typeof View>>(null);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);

  // The dim is a save-layer on the active word (see `getActiveWordLayer`), so
  // the sentence that holds the active word re-records. Each sentence narrows
  // the reader-wide id to its own words on the UI runtime, so a tap re-renders
  // only the sentence the tooltip opens in and the one it left.
  const [activeWordId, setActiveWordId] = useState<WordId | null>(null);
  const wordIds = words.map(word => word.id);
  useAnimatedReaction(
    () => {
      const active = activeWordIdSV?.get() ?? null;
      return active !== null && wordIds.some(id => id === active) ? active : null;
    },
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(setActiveWordId, current);
      }
    },
  );

  // Read the block's width before the first paint, so the words never draw at a
  // provisional layout and then jump. Fabric has laid the view out by the time
  // a layout effect runs, and the state update re-renders before the frame.
  // FlashList recycles this component for the next sentence, so a recycled
  // cell already knows its width. `onLayout` follows later resizes.
  useLayoutEffect(() => {
    const node = blockRef.current;
    if (availableWidth !== null || !node || typeof node.getBoundingClientRect !== 'function') {
      return;
    }
    const { width } = node.getBoundingClientRect();
    if (width > 0) {
      setAvailableWidth(width);
    }
  }, [availableWidth]);

  const handleBlockLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== availableWidth) {
      setAvailableWidth(width);
    }
  };

  // The tutorial pulse: the first word's marker breathes between full and
  // subtle. `withRepeat`/`withTiming` follow the OS reduce-motion setting
  // (`ReduceMotion.System`), where an infinite reversing repeat holds its START
  // value — so the pulse starts at FULL and breathes down, and with the setting
  // on the marker stays solid. It used to start at SUBTLE and breathe up, which
  // the same rule parked at 30%. The CSS animation this replaces ignored the
  // setting altogether.
  const markerPulse = useSharedValue<number>(LAYOUT.OPACITY.FULL);
  useEffect(() => {
    markerPulse.set(LAYOUT.OPACITY.FULL);
    if (!highlightFirstWord) {
      return;
    }
    markerPulse.set(
      withRepeat(
        withTiming(LAYOUT.OPACITY.SUBTLE, {
          // One leg of the breath, as the CSS pulse this replaced ran it.
          duration: BREATHE_HALF_PERIOD.TUTORIAL_MARKER,
          easing: BREATHE_EASING,
        }),
        -1,
        true,
      ),
    );
  }, [highlightFirstWord, markerPulse]);

  const markerHeights = words.map((word, index) =>
    getMarkerHeight(
      highlightFirstWord && index === 0,
      highlightRootId != null && word.root_id === highlightRootId,
      selectedRootIds.has(word.root_id),
    ),
  );

  if (!gpuAvailable) {
    return (
      <View style={[styles.wordsContainer, styles.fallbackRow]}>
        {words.map((word, index) => {
          const markerHeight = markerHeights[index] ?? 0;
          return (
            <WordTarget
              key={`word-${word.position}`}
              word={word}
              onWordPress={onWordPress}
              onWordLongPress={onWordLongPress}
              style={styles.fallbackWord}
            >
              <ThemedText type="arabic" style={{ color: colors.arabicText }}>
                {word.word_form}
              </ThemedText>
              {markerHeight > 0 && (
                <View
                  style={[
                    styles.fallbackMarker,
                    { height: markerHeight, backgroundColor: colors.tint },
                  ]}
                  pointerEvents="none"
                />
              )}
            </WordTarget>
          );
        })}
      </View>
    );
  }

  // Paragraphs are built and measured together, from fresh: the ink overhang is
  // measured on the paragraph as laid out at `PARAGRAPH_LAYOUT_WIDTH`, and the
  // canvas lays it out again at its own width when it draws.
  const paintedWords = words.map(word => {
    const paragraph = buildWordParagraph({ word, colors, fontSize, fontFamily, fontManager });
    return { word, paragraph, metrics: measureSentenceWord(paragraph, fontSize, fontFamily) };
  });

  const layout =
    availableWidth === null
      ? null
      : layoutSentenceWords(
          paintedWords.map(({ metrics }) => metrics),
          availableWidth,
        );

  // Boxes snap to the pixel grid, as Yoga snapped every word's canvas.
  const boxes = (layout?.words ?? []).map(({ x, y }) => ({
    x: PixelRatio.roundToNearestPixel(x),
    y: PixelRatio.roundToNearestPixel(y),
  }));

  // The paint can reach past the block: a word's ink reserve overhangs its
  // margins at the line ends, and a single word wider than the line overflows
  // to the left. The canvas covers all of it, so nothing is clipped that the
  // separate canvases used to paint.
  const paintLeft = Math.min(0, ...boxes.map(box => box.x));
  const paintRight = Math.max(
    availableWidth ?? 0,
    ...boxes.map((box, index) => box.x + (paintedWords[index]?.metrics.boxWidth ?? 0)),
  );
  const blockHeight = layout?.height ?? 0;

  return (
    <View style={styles.wordsContainer}>
      <View
        ref={blockRef}
        testID="sentence-words-block"
        onLayout={handleBlockLayout}
        style={{ height: blockHeight }}
      >
        {layout && (
          <Canvas
            style={{
              position: 'absolute',
              top: 0,
              left: paintLeft,
              width: paintRight - paintLeft,
              height: blockHeight,
            }}
            pointerEvents="none"
          >
            <Group transform={[{ translateX: -paintLeft }]}>
              {paintedWords.map(({ word, paragraph, metrics }, index) => (
                <SentenceWordPaint
                  key={`word-${word.position}`}
                  paragraph={paragraph}
                  metrics={metrics}
                  x={boxes[index]?.x ?? 0}
                  y={boxes[index]?.y ?? 0}
                  dimmed={word.id === activeWordId}
                  markerHeight={markerHeights[index] ?? 0}
                  markerColor={colors.tint}
                  markerOpacity={highlightFirstWord && index === 0 ? markerPulse : undefined}
                />
              ))}
            </Group>
          </Canvas>
        )}
        {layout &&
          paintedWords.map(({ word, metrics }, index) => (
            <WordTarget
              key={`word-${word.position}`}
              word={word}
              onWordPress={onWordPress}
              onWordLongPress={onWordLongPress}
              style={{
                position: 'absolute',
                left: boxes[index]?.x ?? 0,
                top: boxes[index]?.y ?? 0,
                width: metrics.boxWidth,
                height: metrics.height,
              }}
            />
          ))}
      </View>
    </View>
  );
};

interface SentenceWordPaintProps {
  paragraph: SkParagraph | null;
  metrics: SentenceWordMetrics;
  /** Top-left of the word's box in the canvas. */
  x: number;
  y: number;
  /** The word's tooltip is open. */
  dimmed: boolean;
  markerHeight: number;
  markerColor: string;
  /** The tutorial pulse, for the one word that carries it. */
  markerOpacity?: SharedValue<number>;
}

/**
 * One word inside the sentence canvas: its paragraph, dimmed while its tooltip
 * is open, and its marker rule at the foot of its box. The rule spans the glyph
 * advance (the box less its padding and ink reserves) and is withheld until
 * there is a word to mark.
 */
function SentenceWordPaint({
  paragraph,
  metrics,
  x,
  y,
  dimmed,
  markerHeight,
  markerColor,
  markerOpacity,
}: SentenceWordPaintProps) {
  if (!paragraph) {
    return null;
  }

  const glyphLeft = x + WORD_PADDING;
  return (
    <>
      <Group layer={dimmed ? getActiveWordLayer() : undefined}>
        <SkiaParagraph
          paragraph={paragraph}
          x={glyphLeft}
          y={y + metrics.paintY}
          width={metrics.layoutWidth}
        />
      </Group>
      {markerHeight > 0 && (
        <Rect
          x={glyphLeft + metrics.inkLeft}
          y={y + metrics.height - markerHeight}
          width={metrics.width - metrics.inkLeft - metrics.inkRight}
          height={markerHeight}
          color={markerColor}
          opacity={markerOpacity ?? LAYOUT.OPACITY.FULL}
        />
      )}
    </>
  );
}

interface WordTargetProps {
  word: SentenceWord;
  onWordPress?: (word: SentenceWord, layout: LayoutRectangle) => void;
  onWordLongPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  style: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * The native side of one word: its press target and its screen-reader stop.
 *
 * A word is a control only where something happens when you press it. In the
 * word detail screen's examples there are no handlers, and a word that looked
 * tappable there used to swallow the tap and give nothing back.
 *
 * The word is painted on a canvas, so a screen reader has no text to read:
 * the label carries the Arabic. The long-press save is offered as a named
 * action (VoiceOver's actions rotor, TalkBack's long-press), since
 * press-and-hold is not something a screen-reader user can aim at a word.
 */
function WordTarget({ word, onWordPress, onWordLongPress, style, children }: WordTargetProps) {
  // Measured fresh on every press, on the box itself: the tooltip anchors on it.
  const pressableRef = useRef<ComponentRef<typeof View>>(null);
  // Async measurement callbacks must not fire into an unmounted word.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const testID = `sentence-word-${word.position}`;
  const accessibilityProps = {
    accessibilityLabel: word.word_form,
    accessibilityLanguage: 'ar',
  } as const;

  if (!onWordPress && !onWordLongPress) {
    return (
      <View
        style={style}
        testID={testID}
        accessible
        {...accessibilityProps}
        accessibilityRole="text"
      >
        {children}
      </View>
    );
  }

  const handlePress = () => {
    if (!pressableRef.current || !onWordPress) return;
    try {
      pressableRef.current.measureInWindow((x, y, width, height) => {
        // A word scrolled out of the window measures as a zero box; anchoring a
        // tooltip to it would put it in the corner of the screen.
        if (isMountedRef.current && x !== undefined && y !== undefined && width > 0 && height > 0) {
          onWordPress(word, { x, y, width, height });
        }
      });
    } catch {
      // A failed measurement only means no tooltip for this tap.
    }
  };

  // Long-press: instant save. The measured frame is only needed for the no-root
  // fallback (tooltip mode), so a failed measurement still saves.
  const handleLongPress = () => {
    if (!onWordLongPress) return;
    try {
      pressableRef.current?.measureInWindow((x, y, width, height) => {
        if (!isMountedRef.current) return;
        const layout =
          x !== undefined && y !== undefined && width > 0 && height > 0
            ? { x, y, width, height }
            : undefined;
        onWordLongPress(word, layout);
      });
    } catch {
      onWordLongPress(word, undefined);
    }
  };

  return (
    <Pressable
      ref={pressableRef}
      style={style}
      testID={testID}
      onPress={handlePress}
      onLongPress={onWordLongPress ? handleLongPress : undefined}
      delayLongPress={TIMING_CONSTANTS.WORD_LONG_PRESS_DELAY}
      {...accessibilityProps}
      accessibilityRole="button"
      accessibilityHint={onWordPress ? STRINGS.ARABIC_WORD_A11Y_HINT : undefined}
      accessibilityActions={
        onWordLongPress
          ? [{ name: 'longpress', label: STRINGS.ARABIC_WORD_A11Y_TOGGLE_PRACTICE }]
          : undefined
      }
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'longpress') handleLongPress();
      }}
    >
      {children}
    </Pressable>
  );
}

function QueryConnectedSentenceWords(props: SkiaSentenceWordsProps) {
  const selectedRootIds = useSentenceSelectedRoots(props.words);
  return <SentenceWordsInternal {...props} selectedRootIds={selectedRootIds} />;
}

export function SkiaSentenceWords(props: SkiaSentenceWordsProps) {
  if (props.selectedRootIds === undefined) {
    return <QueryConnectedSentenceWords {...props} />;
  }
  return <SentenceWordsInternal {...props} selectedRootIds={props.selectedRootIds} />;
}

const styles = StyleSheet.create({
  wordsContainer: {
    minHeight: LAYOUT.SPACING.XLARGE * 1.5,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: 0, // No gap - English and Arabic belong together
    paddingBottom: LAYOUT.SPACING.SMALL, // Minimal bottom, separation handled by next English's paddingTop
    width: '100%',
  },
  fallbackRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.HALF_TINY,
  },
  fallbackWord: {
    paddingHorizontal: LAYOUT.SPACING.MICRO,
    position: 'relative',
  },
  fallbackMarker: {
    bottom: 0,
    left: LAYOUT.SPACING.MICRO,
    position: 'absolute',
    right: LAYOUT.SPACING.MICRO,
  },
});
