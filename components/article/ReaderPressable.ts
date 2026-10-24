/**
 * The Pressable every control in the article reader is built on:
 * react-native-gesture-handler's, not react-native's. Pass it as
 * `PressableComponent` (BaseCard, PlaylistItemCard, GlassIconButton,
 * GlyphButton all take one).
 *
 * The reader's content sits inside a GestureDetector whose Tap gesture
 * (`useTapGesture` in app/article/[id].tsx) closes the word tooltip on a tap
 * that lands on no word. A native gesture-handler ancestor wins the touch
 * against descendants on the JS responder system, so a react-native Pressable
 * in there silently stops receiving taps: the related-article rows, the
 * word-tap hint's close and — back when they sat inside the content — the
 * close, listen and playlist buttons all went dead that way. Gesture-handler's
 * Pressable is a native gesture itself, so it takes part in that arena.
 *
 * The floating close/listen/playlist buttons are drawn outside the detector
 * now, and use it anyway: one rule for the whole reader, rather than a
 * judgement per control about where the detector ends.
 */
export { Pressable as ReaderPressable } from 'react-native-gesture-handler';
