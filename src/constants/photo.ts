// Profile photo rules: the same limits as the `avatars` bucket in supabase/migrations.
// One place for the numbers and the messages, so the picker and server errors agree.

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export const PHOTO_TOO_BIG = 'That photo is over 5 MB. Pick a smaller one.';
export const PHOTO_WRONG_TYPE = 'Use a JPG, PNG, WebP or HEIC photo.';
