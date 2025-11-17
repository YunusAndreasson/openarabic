/**
 * Web Share API utilities with fallback to clipboard
 * 2025 best practices for viral content sharing
 */

interface ShareData {
  title: string;
  text?: string;
  url: string;
}

/**
 * Share content using Web Share API (mobile) or copy to clipboard (desktop)
 * Returns true if successful, false otherwise
 */
export async function shareArticle(data: ShareData): Promise<boolean> {
  try {
    // Check if Web Share API is supported (most mobile browsers)
    if (navigator.share) {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return true;
    }

    // Fallback: Copy to clipboard
    await navigator.clipboard.writeText(data.url);
    return true;
  } catch (error) {
    // User cancelled share or clipboard permission denied
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled - not an error
      return false;
    }
    console.error('Share failed:', error);
    return false;
  }
}

/**
 * Check if Web Share API is available
 */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}
