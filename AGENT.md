# OpenArabic - React Native Arabic Language Learning App

**Version**: `1447.3.1+55` (Islamic Calendar Versioning)

This repository contains a sophisticated React Native (Expo) app for Arabic language learning featuring spaced repetition vocabulary practice, intelligent article filtering, audio generation, and comprehensive Islamic text processing.

## Core Features & Architecture

### Main Application Features

- **[Library Tab](<app/(tabs)/library/index.tsx>)**: Article browsing with intelligent filtering, difficulty levels, featured sections
- **[Study Tab](<app/(tabs)/study/index.tsx>)**: FSRS-based spaced repetition vocabulary learning with dictionary
- **[Bookmarks Tab](<app/(tabs)/bookmarks/index.tsx>)**: Audio playback with playlist management, sleep timer, repeat controls
- **[Account Settings](<app/(tabs)/library/account/>)**: Font selection, theme management, Islamic calendar integration
- **[Review Flow](app/study/review.tsx)**: Visual vocabulary practice with word display and translation

### Technical Stack (Current)

- **React Native**: 0.79.5 with React 19.0.0
- **Expo SDK**: 53 with New Architecture enabled
- **Navigation**: Expo Router v5.1.5 with typed routes
- **State Management**: Redux Toolkit v2.8.2 with Redux Persist
- **Data Fetching**: TanStack Query v5.85.5 with persistence
- **Audio**: expo-audio v0.4.9, ElevenLabs API for generation
- **Learning Algorithm**: ts-fsrs v5.2.2 for spaced repetition
- **Backend**: Supabase JS v2.56.0 for database/auth
- **Testing**: Jest v29.7.0 with React Native Testing Library v13.3.2

## Development Rules & Guidelines

### Code Quality Standards (Strict Mode)

- **TypeScript**: Strict mode enabled, no `any` types allowed
- **ESLint**: Flat config with comprehensive rules
- **Import patterns**: Use `import type` for type-only imports
- **Investigation First**: Search existing patterns before creating new code

### Essential Rules from `.cursor/rules/`

- **[code-guidelines.mdc](.cursor/rules/code-guidelines.mdc)**: Investigation-first approach, hooks for logic, constants usage
- **[design.mdc](.cursor/rules/design.mdc)**: Mobile UX laws (Tesler, Hick, Fitts, Miller), minimalist aesthetic
- **[performance-optimization.mdc](.cursor/rules/performance-optimization.mdc)**: React.memo, memoization patterns
- **[bug-fixing.mdc](.cursor/rules/bug-fixing.mdc)**: Systematic debugging approach

## Directory Structure

### App Screens (Expo Router)

```
app/
├── (tabs)/                     # Main tab navigation
│   ├── listen/                 # Audio playback tab
│   ├── practice/               # Vocabulary practice tab with dictionary
│   └── read/                   # Reading tab with articles and account
│       ├── account/            # Settings, fonts, themes, calendar
│       ├── article/[id].tsx    # Individual article reader
│       ├── filter.tsx          # Article filtering
│       └── filterModal.tsx     # Filter modal overlay
├── auth/                       # Authentication flow
└── study/review.tsx            # Standalone vocabulary review
```

### Core Application Structure

- **`hooks/`** - Business logic hooks organized by domain (articles, audio, auth, vocabulary)
- **`components/`** - Reusable UI components with consistent theming
- **`constants/`** - Configuration, theme values, strings, and system constants
- **`services/`** - External API communication (Supabase, audio services)
- **`store/`** - Redux slices for global state management
- **`types/`** - TypeScript definitions for API responses, UI props, navigation
- **`utils/`** - Helper functions, error handling, Arabic text analysis

## Testing & Development

### Testing Framework

- **Framework**: Jest v29.7.0 with React Native Testing Library v13.3.2
- **Location**: Test files in `__tests__/`, mocks in `__mocks__/`
- **Commands**: `yarn test`, `yarn test:watch`, `yarn test:coverage`
- **Timeout**: 10 seconds for async operations

### Development Commands

- **Validation**: `yarn validate` (TypeScript + ESLint + Knip)
- **CI Pipeline**: `yarn ci` (validation + test coverage)
- **Type Check**: `yarn typecheck` (TypeScript only)
- **AI Commands**: `yarn ai:check`, `yarn ai:validate:fast`, `yarn ai:parallel`

## Critical Constants & File References

### Essential Files (MANDATORY USAGE)

- **[database.types.ts](types/database.types.ts)**: All Supabase table types and schemas
- **[Colors.ts](constants/Colors.ts)**: Complete theme system with light/dark modes
- **[layout.ts](constants/layout.ts)**: Typography, spacing, shadows, touch targets
- **[fsrs.ts](constants/fsrs.ts)**: Spaced repetition system constants and query keys
- **[routes.ts](constants/routes.ts)**: Navigation route paths with `/(tabs)` prefix
- **[strings.ts](constants/strings.ts)**: All user-facing text and messages

### Required Usage Patterns

- **Typography**: Use `TYPOGRAPHY_HIERARCHY` from `layout.ts`
- **Spacing**: Use `LAYOUT.SPACING` scale (TINY=4px → XLARGE=24px)
- **Elevation**: Use `LAYOUT.ELEVATION.SUBTLE/SMALL/MEDIUM/LARGE`
- **Colors**: Use semantic colors from `Colors.ts` (no hardcoded hex)
- **Navigation**: Use `ROUTE_PATHS` constants with `/(tabs)` prefix
- **FSRS Queries**: Use `FSRS_QUERY_KEYS` starting with `'fsrs-words'`

## Arabic Text Handling (CRITICAL)

### Single-Word Color-Coding Rule

- **NEVER** apply grammar color-coding to single English words
- Color-coding only for multi-word phrases showing Arabic component construction
- **Always check**: `text.trim().split(/\s+/).length === 1` before color analysis
- Single words display in standard text color regardless of Arabic analysis

## AI Agent Guidelines

### Pre-Development Checklist

1. **Investigation First**: Search existing implementations before coding
2. **Constants Usage**: Never hardcode - use values from `constants/`
3. **Type Safety**: Import from `types/`, use `import type`
4. **Performance**: Apply React.memo, useMemo, useCallback from start
5. **Error Handling**: Use `handleError()` utility for async operations

### End of Session Requirements (MANDATORY)

1. `yarn test` - Ensure all tests pass
2. `yarn validate` - Check types, linting, dependencies
3. Clean up temporary files
4. Verify no console errors/warnings

### Success Metrics

- ✅ Zero TypeScript/ESLint errors
- ✅ All tests pass with coverage
- ✅ Performance optimizations applied
- ✅ Constants used (no hardcoded values)
- ✅ Proper error handling
- ✅ Type safety (no `any` types)
- ✅ Arabic text handling follows single-word rules

## Key Implementation Notes

### Analytics Service Status

- **Analytics**: Currently disabled/mocked (Mixpanel integration disabled)
- Do not implement new tracking until service restoration
- Error handling includes analytics properties but they're not sent

### Performance Requirements

- **Lists**: Use `@shopify/flash-list` v1.7.6 (not FlatList) for all large lists
- **Memoization**: Apply React.memo, useMemo, useCallback proactively
- **Audio Cleanup**: Proper resource cleanup on component unmount
- **Cache Management**: Use proper query invalidation for FSRS vocabulary data

### Haptic Feedback Rules

- Avoid double haptic feedback from multiple components
- Use `selectionFeedback` for most interactions
- Import from `utils/haptics.ts`

---

_This guide serves as a comprehensive reference for developing high-quality, performant React Native code in the OpenArabic language learning application. Always prioritize investigation-first development, strict type safety, and consistent use of the established design system._
