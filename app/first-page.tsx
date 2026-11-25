import { TrackWordSheet } from '@/components/first-page/TrackWordSheet';
import { beginReaderSave, usePendingReaderSave } from '@/hooks/onboarding/useReaderSave';
import type { RootId } from '@/types/branded.types';
import type { SaveMethod } from '@/services/readerSave';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams } from 'expo-router';
import { openReaderHeaderAuth } from '@/services/readerSaveAuth';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReaderSignIn } from '@/components/auth/ReaderSignIn';
import { SkiaColoredArabic } from '@/components/common/SkiaColoredArabic';
import { PassageHeader } from '@/components/first-page/PassageHeader';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { BrandedBottomSheet, IconButton } from '@/components/ui';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { SCROLL_EVENT_THROTTLE } from '@/constants/animation';
import { ARTICLE_PLAYBACK_RATES } from '@/constants/audio';
import { getArabicHeroTextStyle, LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFirstPage } from '@/hooks/onboarding/useFirstPage';
import { useColors } from '@/hooks/theme/useColors';
import { useAndroidBackHandler } from '@/hooks/ui/useAndroidBackHandler';
import { analytics } from '@/services/analytics';
import { loadFirstPage, type PassageWord } from '@/services/firstPage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectArabicFontSize,
  selectArticlePlaybackRate,
  setArticlePlaybackRate,
} from '@/store/settingsSlice';

type Sheet =
  | { kind: 'word'; word: PassageWord }
  | { kind: 'audio' }
  | { kind: 'auth'; surface: ReturnType<typeof openReaderHeaderAuth> };
const page = loadFirstPage();

export default function FirstPage() {
  const { session } = useAuth();
  const { widgetPosition, widgetWord } = useLocalSearchParams<{
    widgetPosition?: string;
    widgetWord?: string;
  }>();
  const [lineIndex, wordIndex] =
    typeof widgetPosition === 'string' && /^\d+\.\d+$/.test(widgetPosition)
      ? widgetPosition.split('.').map(Number)
      : [];
  const linkedWord = page.sentences[lineIndex ?? -1]?.words[wordIndex ?? -1];
  const linePositions = useRef(new Map<number, number>());
  const linkKey = linkedWord ? `${widgetPosition}:${widgetWord ?? ''}` : undefined;
  const [previousLink, setPreviousLink] = useState(linkKey);
  const [sheet, setSheet] = useState<Sheet | null>(() =>
    linkedWord && widgetWord === 'true' ? { kind: 'word', word: linkedWord } : null,
  );
  if (previousLink !== linkKey) {
    setPreviousLink(linkKey);
    setSheet(linkedWord && widgetWord === 'true' ? { kind: 'word', word: linkedWord } : null);
  }
  const pending = usePendingReaderSave();
  const save =
    pending?.word.source === 'first_run_reader' &&
    (!pending.owner || pending.owner === session?.user?.id)
      ? pending
      : null;
  const pendingWord =
    save &&
    page.sentences
      .flatMap(line => line.words)
      .find(word => word.practice?.occurrenceId === save.word.occurrenceId);
  const showingSave = !!save && !save.keepReading;
  const open = showingSave || (sheet !== null && !(sheet.kind === 'auth' && session));
  const reader = useFirstPage(open);
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const [source, setSource] = useState<number>();
  const [audioError, setAudioError] = useState(false);
  const hasSaved = useAppSelector(state => state.firstPage.hasSaved);
  const { width } = useWindowDimensions();
  const wordMaxWidth = width - 2 * LAYOUT.SPACING.LARGE;
  const size = useAppSelector(selectArabicFontSize);
  const rate = useAppSelector(selectArticlePlaybackRate);
  const dispatch = useAppDispatch();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const wordRefs = useRef(new Map<PassageWord, ComponentRef<typeof View>>());
  const selected = sheet?.kind === 'word' ? sheet.word : undefined;
  const scrollView = useRef<ComponentRef<typeof ScrollView>>(null);
  const restored = useRef(false);

  useEffect(() => {
    if (!linkedWord || lineIndex === undefined) return;
    const y = linePositions.current.get(lineIndex);
    if (y !== undefined) scrollView.current?.scrollTo({ y, animated: false });
  }, [lineIndex, linkedWord]);

  useAndroidBackHandler(reader.focused && !open, () => reader.exit('back'));
  function close() {
    if (sheet?.kind === 'auth' && !session) sheet.surface.dismiss();
    setSheet(null);
    if (selected) {
      const target = wordRefs.current.get(selected);
      if (target)
        requestAnimationFrame(() => AccessibilityInfo.sendAccessibilityEvent(target, 'focus'));
    }
  }
  function play(asset?: number) {
    setAudioError(false);
    if (asset === undefined) {
      setSheet({ kind: 'audio' });
      return;
    }
    try {
      if (source === asset && status.playing) {
        player.pause();
        return;
      }
      if (source !== asset || status.didJustFinish || status.currentTime >= status.duration)
        player.replace(asset);
      player.setPlaybackRate(rate);
      player.play();
      setSource(asset);
    } catch {
      setAudioError(true);
      setSheet({ kind: 'audio' });
    }
  }
  function addWord(word: PassageWord, method: SaveMethod) {
    const entry = word.practice;
    if (!entry) return;
    void beginReaderSave(
      {
        source: 'first_run_reader',
        occurrenceId: entry.occurrenceId,
        rootId: entry.rootId as RootId,
        form: word.form,
        gloss: word.gloss,
      },
      method,
      session?.user?.id,
    );
  }
  function showWord(word: PassageWord) {
    setSheet({ kind: 'word', word });
    void analytics.track(ANALYTICS_EVENTS.WORD_CARD_OPENED, {
      via: 'tap',
      source: 'first_run_reader',
      in_study: false,
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollView}
        accessibilityElementsHidden={open}
        importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}
        contentContainerStyle={{ paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE }}
        onContentSizeChange={() => {
          if (restored.current) return;
          restored.current = true;
          if (!linkedWord && reader.initialOffset > 0)
            scrollView.current?.scrollTo({ y: reader.initialOffset, animated: false });
        }}
        onLayout={event => reader.setHeight(event.nativeEvent.layout.height)}
        scrollEventThrottle={SCROLL_EVENT_THROTTLE}
        onScrollEndDrag={reader.commitPosition}
        onMomentumScrollEnd={reader.commitPosition}
        onScroll={event => reader.scroll(event.nativeEvent.contentOffset.y)}
      >
        <PassageHeader
          page={page}
          playing={source === page.audio && status.playing}
          browse={() => reader.exit('browse')}
          play={() => play(page.audio)}
          options={() => setSheet({ kind: 'audio' })}
          signIn={
            session
              ? undefined
              : () => {
                  setSheet({ kind: 'auth', surface: openReaderHeaderAuth() });
                }
          }
        />
        {page.sentences.map((line, i) => (
          <View
            key={line.sentenceId ?? i}
            style={styles.pair}
            onLayout={event => {
              const y = event.nativeEvent.layout.y;
              linePositions.current.set(i, y);
              if (i === 0) reader.setPairTop(y);
              if (linkedWord && i === lineIndex)
                scrollView.current?.scrollTo({ y, animated: false });
            }}
          >
            <ThemedText colorName="secondaryText" style={styles.translation}>
              {line.translation}
            </ThemedText>
            <View
              style={styles.words}
              onLayout={
                i === 0 ? event => reader.setArabicTop(event.nativeEvent.layout.y) : undefined
              }
            >
              {line.words.map((word, j) => (
                <Pressable
                  key={word.practice?.occurrenceId ?? j}
                  ref={node => {
                    if (node) wordRefs.current.set(word, node);
                    else wordRefs.current.delete(word);
                  }}
                  accessibilityLanguage="ar"
                  accessibilityLabel={word.form}
                  accessibilityHint={STRINGS.OPEN_WORD_DETAILS_HINT}
                  accessibilityRole="button"
                  onPress={() => showWord(word)}
                  onLongPress={word.practice ? () => addWord(word, 'long_press') : undefined}
                  style={[styles.word, selected === word && { backgroundColor: colors.elevation2 }]}
                >
                  <View
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden
                    style={
                      word.suggested && {
                        borderBottomWidth: LAYOUT.BORDER.WIDTH.NORMAL,
                        borderColor: colors.tint,
                      }
                    }
                  >
                    <SkiaColoredArabic
                      text={word.form}
                      segments={word.segments?.map(seg => ({
                        text: seg.text,
                        color: seg.role ? colors.grammar[seg.role] : colors.arabicText,
                      }))}
                      fontSize={size}
                      wordMaxWidth={wordMaxWidth}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
            {i === 0 && !reader.tipHidden && (
              <View style={[styles.tip, { backgroundColor: colors.elevation2 }]}>
                <ThemedText style={styles.tipText} type="caption">
                  {STRINGS.FIRST_PAGE_TIP}
                </ThemedText>
                <ThemedButton
                  variant="ghost"
                  title={STRINGS.FIRST_PAGE_HIDE_TIP}
                  onPress={reader.hideTip}
                />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <BrandedBottomSheet isVisible={open && !showingSave} onClose={close}>
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          contentContainerStyle={[
            styles.sheet,
            { paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE },
          ]}
        >
          {selected ? (
            <>
              <View style={styles.end}>
                <IconButton
                  icon="close"
                  accessibilityLabel={STRINGS.FIRST_PAGE_BACK}
                  onPress={close}
                />
              </View>
              <ThemedText
                type="arabic"
                align="center"
                accessibilityLanguage="ar"
                style={getArabicHeroTextStyle(size * 1.65)}
              >
                {selected.form}
              </ThemedText>
              <ThemedText type="heading3" align="center">
                {selected.gloss}
              </ThemedText>
              {selected.audio !== undefined && (
                <View style={styles.center}>
                  <IconButton
                    icon="volume-high"
                    accessibilityLabel={STRINGS.PLAY_AUDIO}
                    onPress={() => play(selected.audio)}
                  />
                </View>
              )}
              {selected.practice && (
                <>
                  <ThemedButton
                    title={STRINGS.ADD_TO_PRACTICE}
                    onPress={() => addWord(selected, 'sheet')}
                  />
                  {!hasSaved && (
                    <ThemedText type="caption" align="center">
                      {STRINGS.SAVE_WORD_HINT}
                    </ThemedText>
                  )}
                </>
              )}
              {selected.origin && (
                <View style={styles.origin}>
                  <ThemedText type="label">{STRINGS.WORD_ROOT_SECTION_TITLE}</ThemedText>
                  <ThemedText type="arabicCompact" accessibilityLanguage="ar">
                    {selected.origin.letters}
                  </ThemedText>
                  <ThemedText type="bodyBold">{selected.origin.meaning}</ThemedText>
                  <ThemedText colorName="secondaryText">{selected.origin.note}</ThemedText>
                </View>
              )}
            </>
          ) : sheet?.kind === 'auth' && !session ? (
            <>
              <ReaderSignIn startHeader={sheet.surface.start} />
              <ThemedButton title={STRINGS.READER_NOT_NOW} variant="ghost" onPress={close} />
            </>
          ) : sheet?.kind === 'audio' ? (
            <>
              <ThemedText type="heading3">{STRINGS.FIRST_PAGE_AUDIO_OPTIONS}</ThemedText>
              {audioError || status.error ? (
                <ThemedText accessibilityRole="alert">{STRINGS.AUDIO_PLAY_FAILED}</ThemedText>
              ) : null}
              {page.audio === undefined ? (
                <ThemedText>{STRINGS.FIRST_PAGE_NO_AUDIO}</ThemedText>
              ) : (
                <>
                  <ThemedText>{STRINGS.PLAYBACK_SPEED}</ThemedText>
                  <View style={styles.rates}>
                    {ARTICLE_PLAYBACK_RATES.map(value => (
                      <ThemedButton
                        key={value}
                        title={STRINGS.PLAYBACK_SPEED_VALUE.replace('{rate}', String(value))}
                        variant={rate === value ? 'filled' : 'outlined'}
                        onPress={() => {
                          dispatch(setArticlePlaybackRate(value));
                          player.setPlaybackRate(value);
                        }}
                      />
                    ))}
                  </View>
                </>
              )}
              <ThemedButton variant="ghost" title={STRINGS.FIRST_PAGE_BACK} onPress={close} />
            </>
          ) : null}
        </BottomSheetScrollView>
      </BrandedBottomSheet>
      {save && (
        <TrackWordSheet
          key={save.id}
          save={save}
          word={pendingWord ?? undefined}
          onPlay={pendingWord?.audio !== undefined ? () => play(pendingWord.audio) : undefined}
          onExit={() => {
            setSheet(null);
            const node = pendingWord && wordRefs.current.get(pendingWord);
            if (node)
              requestAnimationFrame(() => AccessibilityInfo.sendAccessibilityEvent(node, 'focus'));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pair: { paddingTop: LAYOUT.SPACING.LARGE, paddingHorizontal: LAYOUT.SPACING.LARGE },
  translation: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
  },
  words: {
    direction: 'rtl',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  word: {
    flexShrink: 0,
    maxWidth: '100%',
    minHeight: MIN_TOUCH_TARGET.LARGE,
    justifyContent: 'center',
  },
  tip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  tipText: { flexGrow: 1, flexShrink: 1 },
  sheet: { paddingHorizontal: LAYOUT.SPACING.XLARGE, gap: LAYOUT.SPACING.MEDIUM },
  origin: { marginTop: LAYOUT.SPACING.XLARGE, gap: LAYOUT.SPACING.SMALL },
  end: { alignItems: 'flex-end' },
  center: { alignItems: 'center' },
  rates: { flexDirection: 'row', flexWrap: 'wrap', gap: LAYOUT.SPACING.SMALL },
});
