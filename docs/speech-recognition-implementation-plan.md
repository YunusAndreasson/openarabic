# Speech Recognition Implementation Plan

## Overview

Add microphone button to practice screen for English pronunciation checking with fuzzy matching.

## 1. Installation & Setup

### Dependencies

```bash
npx expo install expo-speech-recognition
npm install double-metaphone
```

**Additional Dependencies:**

- `double-metaphone` (~1kB) - Phonetic matching for pronunciation tolerance
- No additional native dependencies required

### App Configuration

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-speech-recognition",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone to practice pronunciation.",
          "speechRecognitionPermission": "Allow $(PRODUCT_NAME) to access speech recognition to help with pronunciation practice."
        }
      ]
    ]
  }
}
```

## 2. Core Implementation Files

### 2.1 Speech Recognition Hook

**Location:** `hooks/practice/useSpeechRecognition.ts`

```typescript
import { useSpeechRecognitionEvent, ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

interface UseSpeechRecognitionProps {
  expectedWord: string;
  vocabularyPreload?: string[]; // All English words in current deck
  onResult: (isCorrect: boolean) => void;
}

// Check device capabilities once
const supportsOnDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();

const buildRecognitionConfig = (expectedWord: string, vocabularyPreload: string[] = []) => ({
  lang: 'en-US',
  interimResults: false,
  maxAlternatives: 5,
  requiresOnDeviceRecognition: supportsOnDevice,
  continuous: true, // Eliminates Android beep - will abort after first result
  addsPunctuation: false,
  // Smart contextual hints: repeat expected word + vocabulary preload
  contextualStrings: [
    ...Array(4).fill(expectedWord), // Weight expected word heavily
    ...vocabularyPreload.slice(0, 20), // Top 20 vocabulary words for context
  ],
  // Platform-specific optimizations for single-word recognition
  iosTaskHint: 'confirmation' as const,
  androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'web_search' },
  // Built-in audio session management
  iosCategory: {
    category: 'playAndRecord' as const,
    categoryOptions: ['duckOthers', 'defaultToSpeaker'] as const,
    mode: 'measurement' as const,
  },
});

// Permission bootstrap - request only what's needed
useEffect(() => {
  (async () => {
    await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
    if (!supportsOnDevice && Platform.OS === 'ios') {
      await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
    }
  })();
}, []);

// Auto-fallback on failure
const safeStart = async (config: any) => {
  try {
    await ExpoSpeechRecognitionModule.start(config);
  } catch (e: any) {
    if (e.code === 'service-not-allowed' && config.requiresOnDeviceRecognition) {
      await ExpoSpeechRecognitionModule.start({ ...config, requiresOnDeviceRecognition: false });
    }
  }
};
```

**Key Optimizations for Single-Word Recognition:**

- `iosTaskHint: 'confirmation'` - Boosts iOS accuracy for very short utterances
- `androidIntentOptions.EXTRA_LANGUAGE_MODEL: 'web_search'` - Better than default for single words
- `contextualStrings` - Expected word repeated 4x + vocabulary preload for context
- `continuous: true` + abort() - Eliminates Android start/stop beep
- `requiresOnDeviceRecognition` - Gated behind device capability check

### 2.2 Enhanced Fuzzy Matching with Phonetic Tolerance

**Location:** `utils/speechMatching.ts`

```typescript
import doubleMetaphone from 'double-metaphone'; // ~1kB library for phonetic matching

export const fuzzyMatchSpeech = (
  transcripts: string[],
  expectedWord: string,
  threshold: number = 0.6 // Lower threshold for more liberal matching
): boolean => {
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\b(a|an|the)\b/g, '') // Remove articles
      .replace(/s$/, '') // Handle plurals
      .trim();

  const expected = normalizeText(expectedWord);

  return transcripts.some(transcript => {
    const normalized = normalizeText(transcript);

    // Exact match
    if (normalized === expected) return true;

    // Partial match (contains expected word)
    if (normalized.includes(expected) || expected.includes(normalized)) return true;

    // Phonetic + string similarity for Arabic speakers' pronunciation patterns
    return calculateEnhancedSimilarity(normalized, expected) >= threshold;
  });
};

// Enhanced similarity with phonetic matching for mispronunciations
const calculateEnhancedSimilarity = (str1: string, str2: string): number => {
  // Phonetic match handles common mispronunciations (e.g., "taught" vs "thought")
  const phonetic1 = doubleMetaphone(str1)[0];
  const phonetic2 = doubleMetaphone(str2)[0];

  if (phonetic1 === phonetic2) return 1.0; // Perfect phonetic match

  // Fallback to string similarity (Levenshtein percentage)
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

// Levenshtein distance implementation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
};
```

**Phonetic Matching Benefits:**

- Handles common Arabic→English pronunciation patterns
- Example: "taught" vs "thought" both produce same phonetic key
- Catches sound-alike words that differ in spelling

### 2.3 Vocabulary Preloading for Context

**Location:** `hooks/practice/useVocabularyPreload.ts`

```typescript
import { useMemo } from 'react';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

// Build vocabulary context for better recognition accuracy
export const useVocabularyPreload = (userId?: string): string[] => {
  const { allWords } = useFSRSQueries({ userId });

  return useMemo(() => {
    if (!allWords?.length) return [];

    // Extract unique English words, prioritize common words
    const englishWords = allWords
      .map(word => word.english)
      .filter(Boolean)
      .filter((word, index, array) => array.indexOf(word) === index) // unique
      .sort((a, b) => a.length - b.length) // shorter words first (more common)
      .slice(0, 50); // Top 50 words for context

    return englishWords;
  }, [allWords]);
};
```

**Built-in Audio Session Management:**

- Audio session configuration now handled via `iosCategory` option in `start()`
- Automatic restoration when recognition ends via `'end'` event listener
- Eliminates manual `setCategoryIOS()` calls and reduces native round-trips

## 3. UI Integration

### 3.1 Microphone Button Addition

**Location:** `components/review/ReviewBottomActions.tsx`

**Current Center Section:**

```typescript
{
  /* Settings Button */
}
<TouchableIcon icon="cog" size={24} onPress={onManageWord} />;
```

**Updated Center Section:**

```typescript
{
  /* Microphone Button */
}
<TouchableIcon
  icon={isListening ? 'stop-circle' : 'microphone'}
  size={24}
  onPress={onSpeechToggle}
  color={isListening ? colors.warning : colors.secondaryText}
/>;

{
  /* Settings Button */
}
<TouchableIcon icon="cog" size={24} onPress={onManageWord} />;
```

### 3.2 Review Screen Integration

**Location:** `app/practice/review/index.tsx`

Add speech recognition integration to existing review flow:

```typescript
// Add to existing imports
import { useSpeechRecognition } from '@/hooks/practice/useSpeechRecognition';
import { useVocabularyPreload } from '@/hooks/practice/useVocabularyPreload';
import { useAuth } from '@/hooks/auth/useAuth';

// Add to component
const { user } = useAuth();
const vocabularyPreload = useVocabularyPreload(user?.id);

const { isListening, startListening, stopListening } = useSpeechRecognition({
  expectedWord: currentWord?.english || '',
  vocabularyPreload, // Provides context for better recognition
  onResult: isCorrect => {
    if (isCorrect) {
      handleCorrect();
    } else {
      // Just continue - no feedback needed
    }
  },
});

const handleSpeechToggle = () => {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
};
```

**Smart Context Integration:**

- Vocabulary preload provides recognition context from user's current word deck
- Expected word weighted 4x in contextual hints
- Up to 50 vocabulary words for disambiguation

## 4. Audio Coordination (Automatic)

### 4.1 Built-in Audio Ducking

```typescript
// Audio coordination handled automatically via iosCategory option:
// - Arabic audio automatically ducked during recognition
// - Audio session restored automatically on 'end' event
// - No manual pause/resume coordination needed
```

### 4.2 Simplified Recognition Flow

```typescript
// Streamlined flow:
// 1. User presses microphone button
// 2. Start recognition with smart contextual hints (expected word + vocabulary)
// 3. Arabic audio automatically ducked via 'duckOthers' option
// 4. Process first final result with enhanced fuzzy matching
// 5. Abort recognition to eliminate beep
// 6. Audio session automatically restored
// 7. If correct: proceed to next word, else: continue current word
```

## 5. Platform Setup

### 5.1 Device Capabilities Check

```typescript
// Check if speech recognition is available
const isAvailable = ExpoSpeechRecognitionModule.isRecognitionAvailable();
const supportsOnDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();

// Show microphone button only if available
if (!isAvailable) {
  // Hide microphone button
}
```

### 5.2 Offline Model Setup (Android)

```typescript
// Ensure offline model is available for speed
const ensureOfflineModel = async () => {
  try {
    await ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({
      locale: 'en-US',
    });
  } catch (error) {
    // Continue with online recognition
  }
};
```

## 6. Error Handling & Event Management

### 6.1 Comprehensive Event Handling

```typescript
// Handle recognition results
useSpeechRecognitionEvent('result', event => {
  if (event.isFinal) {
    // For continuous: true, abort after first final result to eliminate beep
    ExpoSpeechRecognitionModule.abort();

    // Process results with fuzzy matching
    const transcripts = event.results.map(result => result.transcript);
    const isCorrect = fuzzyMatchSpeech(transcripts, expectedWord);
    onResult(isCorrect);
  }
});

// Error handling with auto-fallback
useSpeechRecognitionEvent('error', event => {
  // Auto-retry without on-device if that was the issue
  if (event.error?.code === 'service-not-allowed' && requiresOnDeviceRecognition) {
    safeStart(buildRecognitionConfig(expectedWord, vocabularyPreload));
  } else {
    // Stop listening on other errors
    setIsListening(false);
  }
});

// Automatic audio session restoration
useSpeechRecognitionEvent('end', () => {
  // Audio session automatically restored by library
  setIsListening(false);
});
```

**Key Improvements:**

- `abort()` after first result eliminates Android beep
- Auto-fallback retries without on-device recognition
- Built-in audio session restoration
- No manual audio session management needed

## 7. Memory Management

```typescript
// Cleanup in useEffect
useEffect(() => {
  return () => {
    ExpoSpeechRecognitionModule.stop();
  };
}, []);
```
