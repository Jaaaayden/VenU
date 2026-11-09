import { router, type Href } from 'expo-router';

/**
 * Back if there's somewhere to go back to, otherwise `fallback`.
 * After a web reload or a deep link there's no history, and router.back() would do nothing.
 */
export function goBack(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
