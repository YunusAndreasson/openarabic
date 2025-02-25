# WordDetailsModal Component

The `WordDetailsModal` component displays detailed information about a word, including its translation, root, type, and grammar notes. It provides a smooth and intuitive user experience with elegant animations and a clean, modern design.

## Features

- **Smooth Fade Animation**: Clean fade-in and fade-out transitions for a subtle, professional appearance
- **Responsive Design**: Adapts to different screen sizes while maintaining a maximum width
- **Consistent Styling**: Follows the application's design system with proper spacing, typography, and colors
- **Dark Mode Support**: Automatically adjusts colors and contrast for both light and dark themes
- **Haptic Feedback**: Provides tactile feedback when interacting with the modal
- **Optimized Performance**: Uses memoization to prevent unnecessary re-renders
- **Accessibility**: Includes proper hit slop areas and contrast ratios

## UI Enhancements

1. **Simplified Animations**:

   - Clean fade-in and fade-out transitions
   - Smooth, distraction-free appearance and dismissal
   - Coordinated exit animation before closing

2. **Visual Improvements**:

   - Added a close button for easier dismissal
   - Enhanced pill containers with subtle borders and shadows
   - Improved button styling with proper shadows and feedback
   - Adjusted spacing for better visual hierarchy

3. **Responsive Adjustments**:

   - Dynamic width calculation based on screen size
   - Proper status bar handling with `statusBarTranslucent`
   - Consistent padding and margins across different devices

4. **Theme Integration**:
   - BlurView intensity adjusts based on theme
   - Different background colors for selected state in light/dark modes
   - Proper contrast for text and icons in both themes

## Usage

```tsx
import { WordDetailsModal } from './components/WordDetailsModal';

// Inside your component
const [modalVisible, setModalVisible] = useState(false);
const [selectedWord, setSelectedWord] = useState(null);
const [isWordSelected, setIsWordSelected] = useState(false);

const handleStudyPress = () => {
  // Add word to study list
  setIsWordSelected(true);
};

// Render the modal
<WordDetailsModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  word={selectedWord}
  isSelected={isWordSelected}
  onStudyPress={handleStudyPress}
/>;
```

## Best Practices Implemented

- **Performance Optimization**: Uses `useCallback` and `useMemo` to prevent unnecessary re-renders
- **Animation Efficiency**: Utilizes `useNativeDriver: true` for hardware-accelerated animations
- **Consistent Design**: Follows the application's design system with LAYOUT constants
- **Proper Cleanup**: Animations are properly managed with component lifecycle
- **Platform Specifics**: Uses Platform.select for platform-specific styling
- **Haptic Feedback**: Provides appropriate haptic feedback for interactions
