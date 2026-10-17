import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

/**
 * Every icon the app draws, by its name, mapped to each platform's own symbol
 * set: SF Symbols on iOS (rendered natively by expo-symbols), Material Symbols
 * on Android (a glyph of the Material Symbols font the app embeds natively).
 *
 * The keys are the Ionicons names the app used before, so call sites read the
 * same and the meaning of each icon is unchanged.
 *
 * Android carries the glyph's codepoint so `Icon` can draw it in one pass with
 * the embedded font — expo-symbols' own Android view loads the font in a mount
 * effect and draws an empty box first, a blink on every recycled list row.
 * `__tests__/constants/icons.test.ts` checks every codepoint against the
 * expo-symbols name table, so the two cannot drift. `filled` picks the filled
 * Material font, matching the iOS `.fill` symbol.
 *
 * `null` means the platform has no symbol for it: the brand logos, which keep
 * their Ionicons glyph.
 */
export interface IconSymbol {
  readonly ios: SFSymbol | null;
  readonly android: {
    readonly name: AndroidSymbol;
    readonly codepoint: number;
    readonly filled: boolean;
  } | null;
}

export const ICON_SYMBOLS = {
  add: { ios: 'plus', android: { name: 'add', codepoint: 0xe145, filled: false } },
  'alert-circle': {
    ios: 'exclamationmark.circle.fill',
    android: { name: 'error', codepoint: 0xe000, filled: true },
  },
  'alert-circle-outline': {
    ios: 'exclamationmark.circle',
    android: { name: 'error', codepoint: 0xe000, filled: false },
  },
  'arrow-down': {
    ios: 'arrow.down',
    android: { name: 'arrow_downward', codepoint: 0xe5db, filled: false },
  },
  'arrow-up': {
    ios: 'arrow.up',
    android: { name: 'arrow_upward', codepoint: 0xe5d8, filled: false },
  },
  book: { ios: 'book.fill', android: { name: 'menu_book', codepoint: 0xea19, filled: true } },
  'book-outline': { ios: 'book', android: { name: 'menu_book', codepoint: 0xea19, filled: false } },
  'bookmark-outline': {
    ios: 'bookmark',
    android: { name: 'bookmark', codepoint: 0xe866, filled: false },
  },
  bug: { ios: 'ladybug.fill', android: { name: 'bug_report', codepoint: 0xe868, filled: true } },
  camera: {
    ios: 'camera.fill',
    android: { name: 'photo_camera', codepoint: 0xe412, filled: true },
  },
  'chatbubble-ellipses': {
    ios: 'ellipsis.bubble.fill',
    android: { name: 'sms', codepoint: 0xe625, filled: true },
  },
  'checkmark-circle': {
    ios: 'checkmark.circle.fill',
    android: { name: 'check_circle', codepoint: 0xe86c, filled: true },
  },
  'checkmark-circle-outline': {
    ios: 'checkmark.circle',
    android: { name: 'check_circle', codepoint: 0xe86c, filled: false },
  },
  'checkmark-done': {
    ios: 'checkmark.circle.fill',
    android: { name: 'done_all', codepoint: 0xe877, filled: true },
  },
  'chevron-back': {
    ios: 'chevron.backward',
    android: { name: 'arrow_back', codepoint: 0xe5c4, filled: false },
  },
  'chevron-down': {
    ios: 'chevron.down',
    android: { name: 'expand_more', codepoint: 0xe5cf, filled: false },
  },
  'chevron-forward': {
    ios: 'chevron.forward',
    android: { name: 'chevron_right', codepoint: 0xe5cc, filled: false },
  },
  'chevron-up': {
    ios: 'chevron.up',
    android: { name: 'expand_less', codepoint: 0xe5ce, filled: false },
  },
  close: { ios: 'xmark', android: { name: 'close', codepoint: 0xe5cd, filled: false } },
  'close-circle': {
    ios: 'xmark.circle.fill',
    android: { name: 'cancel', codepoint: 0xe5c9, filled: true },
  },
  'close-outline': { ios: 'xmark', android: { name: 'close', codepoint: 0xe5cd, filled: false } },
  'cloud-offline-outline': {
    ios: 'icloud.slash',
    android: { name: 'cloud_off', codepoint: 0xe2c1, filled: false },
  },
  'color-palette': {
    ios: 'paintpalette.fill',
    android: { name: 'palette', codepoint: 0xe40a, filled: true },
  },
  compass: { ios: 'safari.fill', android: { name: 'explore', codepoint: 0xe87a, filled: true } },
  'compass-outline': {
    ios: 'safari',
    android: { name: 'explore', codepoint: 0xe87a, filled: false },
  },
  construct: {
    ios: 'wrench.and.screwdriver.fill',
    android: { name: 'construction', codepoint: 0xea3c, filled: true },
  },
  'document-text': {
    ios: 'doc.text.fill',
    android: { name: 'description', codepoint: 0xe873, filled: true },
  },
  documents: {
    ios: 'doc.on.doc.fill',
    android: { name: 'file_copy', codepoint: 0xe173, filled: true },
  },
  ear: { ios: 'ear.fill', android: { name: 'hearing', codepoint: 0xe023, filled: true } },
  'ellipse-outline': {
    ios: 'circle',
    android: { name: 'radio_button_unchecked', codepoint: 0xe836, filled: false },
  },
  eye: { ios: 'eye.fill', android: { name: 'visibility', codepoint: 0xe8f4, filled: true } },
  'eye-off': {
    ios: 'eye.slash.fill',
    android: { name: 'visibility_off', codepoint: 0xe8f5, filled: true },
  },
  flame: {
    ios: 'flame.fill',
    android: { name: 'local_fire_department', codepoint: 0xef55, filled: true },
  },
  'flame-outline': {
    ios: 'flame',
    android: { name: 'local_fire_department', codepoint: 0xef55, filled: false },
  },
  flash: { ios: 'bolt.fill', android: { name: 'bolt', codepoint: 0xea0b, filled: true } },
  'hardware-chip': {
    ios: 'cpu.fill',
    android: { name: 'memory', codepoint: 0xe322, filled: true },
  },
  headset: {
    ios: 'headphones.circle.fill',
    android: { name: 'headphones', codepoint: 0xf01f, filled: true },
  },
  'headset-outline': {
    ios: 'headphones',
    android: { name: 'headphones', codepoint: 0xf01f, filled: false },
  },
  'help-circle': {
    ios: 'questionmark.circle.fill',
    android: { name: 'help', codepoint: 0xe887, filled: true },
  },
  'hourglass-outline': {
    ios: 'hourglass',
    android: { name: 'hourglass_empty', codepoint: 0xe88b, filled: false },
  },
  image: { ios: 'photo.fill', android: { name: 'image', codepoint: 0xe3f4, filled: true } },
  infinite: {
    ios: 'infinity',
    android: { name: 'all_inclusive', codepoint: 0xeb3d, filled: false },
  },
  'information-circle': {
    ios: 'info.circle.fill',
    android: { name: 'info', codepoint: 0xe88e, filled: true },
  },
  language: { ios: 'globe', android: { name: 'language', codepoint: 0xe894, filled: false } },
  'layers-outline': {
    ios: 'square.stack.3d.up',
    android: { name: 'layers', codepoint: 0xe53b, filled: false },
  },
  leaf: { ios: 'leaf.fill', android: { name: 'eco', codepoint: 0xea35, filled: true } },
  'library-outline': {
    ios: 'books.vertical',
    android: { name: 'library_books', codepoint: 0xe02f, filled: false },
  },
  'lock-closed': { ios: 'lock.fill', android: { name: 'lock', codepoint: 0xe897, filled: true } },
  'log-out': {
    ios: 'rectangle.portrait.and.arrow.right',
    android: { name: 'logout', codepoint: 0xe9ba, filled: false },
  },
  'logo-apple': { ios: 'apple.logo', android: null },
  'logo-facebook': { ios: null, android: null },
  'logo-google': { ios: null, android: null },
  'logo-instagram': { ios: null, android: null },
  'logo-x': { ios: null, android: null },
  mail: { ios: 'envelope.fill', android: { name: 'mail', codepoint: 0xe158, filled: true } },
  'mail-outline': { ios: 'envelope', android: { name: 'mail', codepoint: 0xe158, filled: false } },
  mic: { ios: 'mic.fill', android: { name: 'mic', codepoint: 0xe029, filled: true } },
  'mic-outline': { ios: 'mic', android: { name: 'mic', codepoint: 0xe029, filled: false } },
  moon: { ios: 'moon.fill', android: { name: 'dark_mode', codepoint: 0xe51c, filled: true } },
  notifications: {
    ios: 'bell.fill',
    android: { name: 'notifications', codepoint: 0xe7f4, filled: true },
  },
  'open-outline': {
    ios: 'arrow.up.right.square',
    android: { name: 'open_in_new', codepoint: 0xe89e, filled: false },
  },
  options: {
    ios: 'slider.horizontal.3',
    android: { name: 'tune', codepoint: 0xe429, filled: false },
  },
  'options-outline': {
    ios: 'slider.horizontal.3',
    android: { name: 'tune', codepoint: 0xe429, filled: false },
  },
  pencil: { ios: 'pencil', android: { name: 'edit', codepoint: 0xe3c9, filled: false } },
  'person-circle': {
    ios: 'person.crop.circle.fill',
    android: { name: 'account_circle', codepoint: 0xe853, filled: true },
  },
  'phone-portrait-outline': {
    ios: 'iphone.radiowaves.left.and.right',
    android: { name: 'vibration', codepoint: 0xe62d, filled: false },
  },
  play: { ios: 'play.fill', android: { name: 'play_arrow', codepoint: 0xe037, filled: true } },
  refresh: {
    ios: 'arrow.counterclockwise',
    android: { name: 'restart_alt', codepoint: 0xf053, filled: false },
  },
  'reorder-three': {
    ios: 'line.3.horizontal',
    android: { name: 'drag_handle', codepoint: 0xe25d, filled: false },
  },
  school: {
    ios: 'graduationcap.fill',
    android: { name: 'school', codepoint: 0xe80c, filled: true },
  },
  'school-outline': {
    ios: 'graduationcap',
    android: { name: 'school', codepoint: 0xe80c, filled: false },
  },
  search: { ios: 'magnifyingglass', android: { name: 'search', codepoint: 0xe8b6, filled: false } },
  'search-outline': {
    ios: 'magnifyingglass',
    android: { name: 'search', codepoint: 0xe8b6, filled: false },
  },
  settings: {
    ios: 'gearshape.fill',
    android: { name: 'settings', codepoint: 0xe8b8, filled: true },
  },
  'settings-outline': {
    ios: 'gearshape',
    android: { name: 'settings', codepoint: 0xe8b8, filled: false },
  },
  'shield-checkmark': {
    ios: 'checkmark.shield.fill',
    android: { name: 'verified_user', codepoint: 0xe8e8, filled: true },
  },
  shuffle: { ios: 'shuffle', android: { name: 'shuffle', codepoint: 0xe043, filled: false } },
  'sparkles-outline': {
    ios: 'sparkles',
    android: { name: 'auto_awesome', codepoint: 0xe65f, filled: false },
  },
  speedometer: { ios: 'speedometer', android: { name: 'speed', codepoint: 0xe9e4, filled: false } },
  star: { ios: 'star.fill', android: { name: 'star', codepoint: 0xe838, filled: true } },
  'star-outline': { ios: 'star', android: { name: 'star', codepoint: 0xe838, filled: false } },
  stop: { ios: 'stop.fill', android: { name: 'stop', codepoint: 0xe047, filled: true } },
  sunny: { ios: 'sun.max.fill', android: { name: 'light_mode', codepoint: 0xe518, filled: true } },
  text: { ios: 'textformat', android: { name: 'text_fields', codepoint: 0xe262, filled: false } },
  time: { ios: 'clock.fill', android: { name: 'schedule', codepoint: 0xe8b5, filled: true } },
  'time-outline': { ios: 'clock', android: { name: 'schedule', codepoint: 0xe8b5, filled: false } },
  timer: { ios: 'timer', android: { name: 'timer', codepoint: 0xe425, filled: false } },
  trash: { ios: 'trash.fill', android: { name: 'delete', codepoint: 0xe872, filled: true } },
  'trash-outline': { ios: 'trash', android: { name: 'delete', codepoint: 0xe872, filled: false } },
  'trending-up': {
    ios: 'chart.line.uptrend.xyaxis',
    android: { name: 'trending_up', codepoint: 0xe8e5, filled: false },
  },
  trophy: {
    ios: 'trophy.fill',
    android: { name: 'emoji_events', codepoint: 0xea23, filled: true },
  },
  'trophy-outline': {
    ios: 'trophy',
    android: { name: 'emoji_events', codepoint: 0xea23, filled: false },
  },
  'volume-high': {
    ios: 'speaker.wave.3.fill',
    android: { name: 'volume_up', codepoint: 0xe050, filled: true },
  },
  warning: {
    ios: 'exclamationmark.triangle.fill',
    android: { name: 'warning', codepoint: 0xe002, filled: true },
  },
} as const satisfies Record<string, IconSymbol>;

export type IconName = keyof typeof ICON_SYMBOLS;

/** Native font families for the Android glyphs, as registered by expo-font in app.json. */
export const MATERIAL_SYMBOL_FONTS = {
  OUTLINED: 'MaterialSymbols-Regular',
  FILLED: 'MaterialSymbols-Filled',
} as const;
