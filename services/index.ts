// Barrel export for services
// Re-exports service modules for cleaner imports
//
// NOTE: This barrel is OPTIONAL for new code. Existing imports use specific paths.
// Some services are excluded due to expo native dependencies that cause Jest issues.
//
// Excluded services (import directly from their files):
// - audioCache (expo-audio)
// - audioPlayer (expo-audio)
// - audioPlaylist (expo-audio)
// - backgroundTasks (expo-background-task)
// - notificationService (expo-notifications)

export * from './accountDeletion';
export * from './analytics';
export * from './articles';
export * from './authors';
export * from './bookmark';
export * from './categories';
export * from './readingProgress';
export * from './studyStreak';
export * from './studyWordsFSRS';
export * from './supabase';
export * from './vocabularyStats';
