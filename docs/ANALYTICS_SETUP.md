# Analytics Setup Guide

## Mixpanel Integration

This app includes a simple Mixpanel analytics implementation that's designed to be easy to use and not over-engineered.

### Current Status

- ✅ Mixpanel package installed
- ✅ Centralized analytics service created
- ✅ All mock implementations replaced
- ✅ TypeScript validation passes
- ✅ Console logging for testing

### Files Created/Modified

1. **`constants/analytics.ts`** - Analytics constants and event names
2. **`services/analytics.ts`** - Centralized analytics service
3. **Replaced mock implementations in:**
   - `app/_layout.tsx`
   - `hooks/auth/useAuthForm.ts`
   - `hooks/account/useAccountScreen.ts`
   - `hooks/notifications/useReminders.ts`

### Setup Instructions

#### 1. Get Your Mixpanel Token

1. Go to [Mixpanel Dashboard](https://mixpanel.com/)
2. Create a project or select existing one
3. Go to Project Settings > Project Token
4. Copy your token

#### 2. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# .env
EXPO_PUBLIC_MIXPANEL_TOKEN=your_actual_mixpanel_token_here
```

#### 3. Enable Real Analytics

Once you have your token, the analytics will automatically start sending real data to Mixpanel. The implementation will detect when you have a real token and switch from console logging to actual tracking.

### Events Currently Tracked

- **User Authentication:**

  - Sign In (with method)
  - Sign Up (with method)
  - Sign Out

- **Practice Sessions:**

  - **Practice Session Complete** - Comprehensive learning session tracking including:
    - **Session Metrics:** words reviewed, known, vague, unknown, mastered
    - **Performance:** accuracy rate, struggle rate, unknown rate
    - **Learning Progress:** average stability increase, longest/current streaks
    - **Session Metadata:** duration, words per minute, completion source
    - **Session Quality:** perfect session indicator, struggle indicators

- **Error Tracking:**

  - **Error Occurred** - Comprehensive error analytics including:
    - **Error Details:** error message, error name, stack trace
    - **Context:** timestamp, custom properties, severity level
    - **User Impact:** toast shown, sentry captured

- **User Properties:**

  - Email
  - Last Active
  - Created At

### Practice Session Completion Data

The **Practice Session Complete** event captures rich learning analytics:

**Session Performance:**

- `wordsReviewed` - Total words in session
- `wordsKnown` - Words answered correctly
- `wordsVague` - Words with uncertain answers
- `wordsUnknown` - Words answered incorrectly
- `masteredWords` - Words reaching mastery threshold

**Performance Metrics:**

- `accuracyRate` - Percentage of correct answers (0-100%)
- `struggleRate` - Percentage of vague answers (0-100%)
- `unknownRate` - Percentage of unknown answers (0-100%)

**Learning Progress:**

- `averageStabilityIncrease` - Average memory stability improvement
- `longestStreak` - Best streak of correct answers
- `currentStreak` - Streak at session end

**Session Metadata:**

- `sessionDurationMs` - Total session time in milliseconds
- `sessionDurationMinutes` - Session length in minutes
- `wordsPerMinute` - Learning speed metric
- `completionSource` - Where session was completed from

**Session Quality Indicators:**

- `hadPerfectSession` - No vague or unknown words
- `hadStruggleWords` - Session included challenging words
- `hadUnknownWords` - Session included unknown words
- `hadMasteredWords` - Words reached mastery level

### Error Tracking Data

The **Error Occurred** event captures comprehensive error analytics:

**Error Details:**

- `errorMessage` - The error message text
- `errorName` - The error type/class name
- `errorStack` - Stack trace (first 500 characters)
- `timestamp` - When the error occurred

**Context Properties:**

- Custom properties passed via `analyticsProperties` option
- Error severity level and categorization
- User context and session information

### Error Handling Integration

The error tracking is integrated into the global `handleError` function:

```typescript
// Basic error tracking (default behavior)
handleError(new Error('Something went wrong'));

// Custom error tracking
handleError(new Error('API failed'), {
  analyticsEventName: 'API Error',
  analyticsProperties: {
    endpoint: '/api/users',
    statusCode: 500,
    userId: '123',
  },
});

// Disable analytics for specific errors
handleError(new Error('Minor issue'), {
  trackAnalytics: false,
});
```

### How to Add New Events

1. **Add to constants** (optional):

```typescript
// constants/analytics.ts
export const ANALYTICS_EVENTS = {
  // ... existing events
  NEW_EVENT: 'New Event Name',
} as const;
```

2. **Track the event**:

```typescript
import { analytics } from '@/services/analytics';

// Simple event
await analytics.track('My Custom Event');

// Event with properties
await analytics.track('Article Read', {
  articleId: '123',
  readTime: 5.2,
  completed: true,
});
```

### Testing

Currently, the implementation logs all events to console with the 🔍 prefix. You can see these in your device logs or browser console.

### Implementation Notes

- **Error Handling:** Analytics failures are silently ignored to prevent breaking the app
- **Lazy Loading:** Mixpanel is only initialized when first used
- **Type Safety:** Full TypeScript support with proper types
- **Simple API:** Only includes methods that are actually used in the codebase

### Troubleshooting

If you don't see events in Mixpanel:

1. Check that your token is correct in `.env`
2. Look for console warnings about analytics failures
3. Verify the event names match what's expected in Mixpanel
4. Check that your Mixpanel project has the correct timezone/date settings

### Security Notes

- The token is exposed to the client-side (standard for Mixpanel)
- Never put sensitive data in analytics events
- Consider using Mixpanel's EU servers if needed for GDPR compliance
