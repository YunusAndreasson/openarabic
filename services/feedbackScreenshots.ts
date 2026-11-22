import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';

import { supabase } from '@/services/supabase';

/**
 * Screenshots attached to in-app feedback. The bucket is private and every object lives under
 * `<userId>/`; only that user can upload, read or delete it
 * (supabase/migrations/20261120_create_feedback_screenshots_bucket.sql).
 */
export const FEEDBACK_SCREENSHOTS_BUCKET = 'feedback-screenshots';

/**
 * How long the link sent with the feedback stays valid. The object itself stays: once the link
 * has expired, the path in the same event still finds it in the dashboard.
 */
export const FEEDBACK_SCREENSHOT_LINK_SECONDS = 90 * 24 * 60 * 60;

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
};

/** The picked file's extension and content type, JPEG when the URI does not say. */
function imageType(uri: string): { extension: string; contentType: string } {
  const pathname = uri.split(/[?#]/, 1)[0] ?? '';
  const extension = /\.([a-z0-9]+)$/i.exec(pathname)?.[1]?.toLowerCase() ?? '';
  const contentType = Object.hasOwn(CONTENT_TYPES, extension)
    ? CONTENT_TYPES[extension]
    : undefined;
  return contentType ? { extension, contentType } : { extension: 'jpg', contentType: 'image/jpeg' };
}

/**
 * Upload a picked screenshot and return its path plus a signed link for the feedback report
 * (`url` is null when only the link failed; the path still identifies the object).
 */
export async function uploadFeedbackScreenshot(
  userId: string,
  uri: string,
): Promise<{ path: string; url: string | null }> {
  // Raw bytes, not a Blob: on React Native a Blob is a handle to native data, and storage-js
  // uploads one as a 0-byte object.
  const bytes = await new File(uri).arrayBuffer();
  const { extension, contentType } = imageType(uri);
  const path = `${userId}/${randomUUID()}.${extension}`;

  const bucket = supabase.storage.from(FEEDBACK_SCREENSHOTS_BUCKET);
  const { error } = await bucket.upload(path, bytes, { contentType });
  if (error) throw error;

  const { data } = await bucket.createSignedUrl(path, FEEDBACK_SCREENSHOT_LINK_SECONDS);
  return { path, url: data?.signedUrl ?? null };
}

/**
 * Delete every feedback screenshot the user uploaded. No cascade reaches Storage, so account
 * deletion calls this while the session can still pass the owner-only policies.
 */
export async function removeFeedbackScreenshots(userId: string): Promise<void> {
  const PAGE = 100;
  const bucket = supabase.storage.from(FEEDBACK_SCREENSHOTS_BUCKET);
  for (;;) {
    const { data: files, error } = await bucket.list(userId, { limit: PAGE });
    if (error) throw error;
    if (files.length === 0) return;

    const { data: removed, error: removeError } = await bucket.remove(
      files.map(file => `${userId}/${file.name}`),
    );
    if (removeError) throw removeError;
    // A refused delete comes back as an empty list, not an error; stop instead of listing the
    // same page forever.
    if (removed.length === 0) throw new Error('Storage did not remove any feedback screenshots');
    if (files.length < PAGE && removed.length === files.length) return;
  }
}
