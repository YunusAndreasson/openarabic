# Repository Guide

This repo contains a React Native (Expo) app built with TypeScript. Core business logic lives in `hooks/` and components live in `components/`. Constants can be found in `constants/`, and common types in `types/`.

## Development Rules

- Follow the code patterns described in `.cursor/rules/`:
  - `code-guidelines.mdc` – always investigate problems before coding, keep logic in hooks, reuse functionality and remove obsolete code.
  - `design.mdc` – apply mobile UX principles (Tesler, Hicks, Fitts, Miller) and keep design consistent using values from `constants/Colors.ts` and `constants/layout.ts`.
  - `copy.mdc` – keep UI text short, friendly and consistent.
  - `cleanup.mdc`, `refactor.mdc`, `bug-fix.mdc`, `perform.mdc` – consult these when cleaning, refactoring or optimising code.
  - `code-review.mdc` – checklist for reviewing pull requests.

## Testing

- Tests use Jest with React Native Testing Library. See `docs/testing-guide.md` for full details and examples.
- Test files live in `__tests__/` and may freely use mocks from `__mocks__/`.
- Run tests with `yarn test`. Watch mode is available via `yarn test:watch`.
- Test files are excluded from linting so any structure is allowed.

## Validation

- Run `yarn validate` before committing. It checks TypeScript and lint rules.
- Optionally run `yarn knip:ci` to check for unused files.

## Useful Docs

- `docs/testing-guide.md` – in‑depth testing instructions.
- `docs/versioning.md` – explains the Islamic calendar versioning scheme and release commands.

Use this file as a quick reference when working on tasks in this repository.

# React Native App Code Guidelines

You are a senior React Native developer tasked with writing performant, reliable and production ready code for a language learning app.

## App Features

- [app/(tabs)/read/index.tsx](<mdc:app/(tabs)/read/index.tsx>) Main screen with list of articles
- [app/(tabs)/practice/index.tsx](<mdc:app/(tabs)/practice/index.tsx>) Entry screen for practicing words using Spaced Repetition
- [app/(tabs)/listen/index.tsx](<mdc:app/(tabs)/listen/index.tsx>) Audio playback for bookmarked articles and listening practice
- [app/(tabs)/read/account/](<mdc:app/(tabs)/read/account/>) Settings and account management

## Core Principles

- Always investigate issues before proposing fixes
- Strive to reduce complexity (while maintaining reliability)
- Focus on understanding root causes, not implementing workarounds
- Reuse existing functionality before creating new functions
- Place business logic in hooks, not components
- The app is mobile-only
- Remove obsolete code when introducing new features
- Do not use legacy features or code
- Only use modern React functional components

## Important Files & Constants

- Database structure: [database.types.ts](mdc:types/database.types.ts)
- Colors & theming: [Colors.ts](mdc:constants/Colors.ts)
- Layout constraints: [layout.ts](mdc:constants/layout.ts)
- Typography system: Use `TYPOGRAPHY_HIERARCHY` from layout.ts
- Shadow system: Use `LAYOUT.SHADOW` constants for consistent elevation
- Spacing system: Use `LAYOUT.SPACING` scale (TINY=4px, SMALL=8px, MEDIUM=12px, etc.)

## Documentation Reference

For detailed development guidance, refer to these comprehensive documentation files:

- **[Architecture Guide](.cursor/rules/architecture.mdc)** - App architecture, data flow patterns, and architectural decisions
- **[Common Patterns](.cursor/rules/common-patterns.mdc)** - Frequently used code patterns, hooks, and implementations
- **[Troubleshooting Guide](.cursor/rules/troubleshooting.mdc)** - Common issues, solutions, and debugging strategies
- **[API Reference](.cursor/rules/api-reference.mdc)** - Complete reference for services, hooks, utilities, and types

## Technical Stack

- **React Native**: 0.79.3 with React 19.0.0
- **Expo SDK**: 53 with New Architecture enabled
- **Navigation**: Expo Router v5.1.0 with typed routes and modal presentation
- **State Management**: Redux Toolkit with Redux Persist
- **Data Fetching**: TanStack Query v5 (React Query) with persistence
- **UI Performance**: @shopify/flash-list for optimized lists
- **Animation**: react-native-reanimated v3.17.4 and @shopify/react-native-skia v2.0.0
- **Audio**: expo-audio v0.4.6 for playback and audio controls
- **Spaced Repetition**: ts-fsrs v5.1.0 for vocabulary learning algorithms
- **Error Tracking**: Sentry v6.14.0 for error logging
- **Analytics**: Currently mocked (Mixpanel integration disabled)
- **Backend**: Supabase v2.50.0 for database, storage and auth
- **Notifications**: expo-notifications v0.31.3 for push notifications
- **Haptics**: expo-haptics v14.1.4 for tactile feedback
- **Testing**: Jest v29.7.0 with React Native Testing Library

## Directory Structure

- `app/(tabs)` - Main tab screen components
- `app/auth` - Authentication screens
- `app/practice` - Standalone practice screens (renamed from vocabulary)
- `app/insights` - Analytics and insights screens
- `hooks/` - Custom React hooks for shared logic
- `components/` - Reusable UI components
- `constants/` - App constants, theme values, and configuration
- `services/` - External API communication (primarily Supabase)
- `store/` - Redux state management with persistence
- `types/` - TypeScript type definitions
- `utils/` - Helper functions and utilities

## Navigation Patterns

- Use Expo Router with modal presentation for overlays
- Modal screens hide tab headers completely
- Use correct route paths: `/(tabs)/read/article/[id]` not `/article/[id]`
- Navigation hierarchy: Read → Account (renamed from Settings)
- Practice tab (renamed from Vocabulary) for spaced repetition

## Best Practices

### Code Quality

- Use types from `/types` directory for consistency
- Never use `any` type - always use proper TypeScript types
- Leverage Expo features when they provide value
- Keep components focused on presentation, hooks on logic
- Follow existing patterns for state management with Redux
- Use consistent naming: PascalCase for components, camelCase for functions

### Styling & Design

- Use `StyleSheet.create()` for static styles, inline for dynamic
- Follow design system from Colors.ts and layout.ts
- Use standardized shadow system: `LAYOUT.SHADOW.SUBTLE/SMALL/MEDIUM/LARGE`
- Use spacing scale: `LAYOUT.SPACING.TINY/SMALL/MEDIUM/LARGE/XLARGE`
- Typography: Use `TYPOGRAPHY_HIERARCHY` constants for consistent text styling
- Touch targets: Minimum 48dp for accessibility (use `TOUCH_TARGETS` constants)

### Performance

- Use `@shopify/flash-list` for large lists instead of FlatList
- Only suggest performance optimizations with measurable impact
- Memoize expensive calculations and components appropriately
- Use React Query for data fetching with proper cache invalidation

### Error Handling

- Use `handleError()` utility from `utils/errorHandling.ts`
- Structure: try/catch in services, Sentry for logging
- Analytics tracking is currently mocked (service disabled)
- Provide user feedback via toast messages

### Data Management

- Structure Supabase queries in `services/` with typed responses
- Use database.types.ts for all database operations
- Follow FSRS query key patterns for vocabulary data
- Use consistent cache invalidation strategies

### Audio & Media

- Use expo-audio for all audio playback
- Handle background audio with proper session configuration
- Implement proper cleanup for audio resources
- Use enhanced audio service for playlist management

## Critical Implementation Notes

### Analytics Service

- **IMPORTANT**: Analytics service is currently disabled/mocked
- All analytics calls use temporary mock implementations
- Do not implement new Mixpanel tracking until service is restored
- Error handling includes analytics properties but they're not sent

### Navigation Issues

- Always use full route paths with `/(tabs)` prefix
- Modal screens should use Expo Router modal system, not React Native Modal
- Avoid navigation parameter bleed between screens

### Memory Management

- Clean up audio resources on component unmount
- Use proper query invalidation for FSRS vocabulary data
- Clear persisted cache when needed via utility functions

### Haptic Feedback

- Avoid double haptic feedback from multiple components
- Use appropriate feedback types: `selectionFeedback` for most interactions
- Import from `utils/haptics.ts`

## Constraints

- Don't be overly strict about linting issues
- Focus on mobile UX patterns, not responsive web design
- App is portrait-only mobile application
- No tablet support (iOS supportsTablet: false)

## Version Management

- Use semantic versioning with build numbers
- Format: `major.minor.patch+buildNumber` (e.g., "1446.12.20+20")
- Build numbers increment for each release

## Testing

- Use Jest with React Native Testing Library
- Test timeout: 10 seconds for async operations
- Coverage reports available via `yarn test:coverage`
- Mock external services appropriately

## Development Workflow

- Use `yarn validate` for type checking, linting, and dependency analysis
- Use `yarn ci` for full validation with test coverage
- Knip for unused code detection
- Patch-package for dependency modifications
