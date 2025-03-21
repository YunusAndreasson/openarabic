// Export ThemedText component
// Export AnimatedItem, EntranceAnimation, and AnimatedSection (all aliases for AnimatedItem)
import AnimatedItem from './AnimatedItem';

export { ThemedText } from './ThemedText';

// Export AnimatedText from its own component rather than from AnimatedThemedText
export { default as AnimatedText } from './AnimatedText';
// For backward compatibility
export { default as AnimatedThemedText } from './AnimatedText';
export { AnimatedItem };
export const EntranceAnimation = AnimatedItem;
export const AnimatedSection = AnimatedItem;
