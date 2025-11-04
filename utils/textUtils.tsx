import React from 'react';

import { EmailLink } from '@/components/common/EmailLink';

// Email regex pattern for detecting email addresses in text
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

/**
 * Average sentences per minute for Arabic language learners
 * Conservative estimate accounting for:
 * - Arabic script reading speed (typically slower than Latin for learners)
 * - Diacritics and word analysis
 * - Vocabulary lookup time
 */
const SENTENCES_PER_MINUTE = 13;

/**
 * Parse text and render email addresses as EmailLink components
 * Useful for rendering user-facing text that may contain contact emails
 *
 * @param text - Text that may contain email addresses
 * @param type - ThemedText type for consistent styling
 * @returns Array of text strings and EmailLink components, or original text if no emails found
 *
 * @example
 * ```tsx
 * <ThemedText type="body">
 *   {parseTextWithEmails('Contact us at support@example.com for help', 'body')}
 * </ThemedText>
 * ```
 */
export const parseTextWithEmails = (
  text: string,
  type: 'body' | 'caption' = 'body',
): string | Array<string | React.ReactElement> => {
  const parts: Array<string | { email: string; key: string }> = [];
  let lastIndex = 0;
  let match;

  // Reset regex state
  EMAIL_REGEX.lastIndex = 0;

  while ((match = EMAIL_REGEX.exec(text)) !== null) {
    const emailMatch = match[1];
    if (!emailMatch) continue;

    // Add text before the email
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add email marker
    parts.push({ email: emailMatch, key: `email-${match.index}` });

    lastIndex = match.index + emailMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no emails found, return the original text directly
  if (parts.length === 0 || (parts.length === 1 && typeof parts[0] === 'string')) {
    return text;
  }

  return parts.map(part => {
    if (typeof part === 'string') {
      return part;
    }
    return <EmailLink key={part.key} email={part.email} type={type} />;
  });
};

/**
 * Calculates estimated reading time based on sentence count
 * Optimized for Arabic language learners
 *
 * @param sentenceCount - Number of sentences in the article
 * @returns Formatted reading time string (e.g., "< 1m", "3m", "15m")
 *
 * @example
 * calculateReadingTime(10) // "< 1m"
 * calculateReadingTime(26) // "2m"
 * calculateReadingTime(130) // "10m"
 */
export function calculateReadingTime(sentenceCount: number): string {
  if (sentenceCount <= 0) {
    return '< 1m';
  }

  // Calculate minutes and round up (better to overestimate than underestimate)
  const minutes = Math.ceil(sentenceCount / SENTENCES_PER_MINUTE);

  if (minutes < 1) {
    return '< 1m';
  }

  return `${minutes}m`;
}
