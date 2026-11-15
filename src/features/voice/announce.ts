// Screen reader announcements. Native has an API; react-native-web's is a no-op, so on web the text
// goes into one visually hidden aria-live region.
// e.g. announce('Listening. Speak now.')

import { AccessibilityInfo, Platform } from 'react-native';

let region: HTMLElement | null = null;

export function announce(text: string): void {
  if (Platform.OS !== 'web') {
    AccessibilityInfo.announceForAccessibility(text);
    return;
  }
  if (typeof document === 'undefined') return;
  if (!region || !region.isConnected) {
    region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('role', 'status');
    Object.assign(region.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' });
    document.body.appendChild(region);
  }
  // Clear first so the same words twice are still read.
  region.textContent = '';
  const r = region;
  setTimeout(() => { r.textContent = text; }, 50);
}

type ToggleState = { accessibilityState: { selected: boolean } };

/**
 * On/off state for the mic button: accessibilityState on native, aria-pressed on web
 * (react-native-web ignores accessibilityState).
 * e.g. <Pressable accessibilityRole="button" {...toggleState(listening)} />
 */
export function toggleState(on: boolean): ToggleState {
  return Platform.OS === 'web'
    ? ({ accessibilityState: { selected: on }, 'aria-pressed': on } as ToggleState)
    : { accessibilityState: { selected: on } };
}
