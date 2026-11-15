/**
 * The venue's own map page in an iframe (web; phones use official-map-frame.tsx).
 * Sandboxed so the page can run and keep its cookie choice, but can't navigate the app away;
 * its links open in a new tab.
 */
import { Colors } from '@/constants/theme';

import type { OfficialMapFrameProps } from './official-map-frame';

const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';

export function OfficialMapFrame({ map, label, onLoad }: OfficialMapFrameProps) {
  // An iframe reports no load errors; the panel's timeout covers a page that never arrives.
  return (
    <iframe
      src={map.url}
      title={label}
      aria-label={label}
      onLoad={onLoad}
      sandbox={SANDBOX}
      allow="fullscreen"
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ flex: 1, width: '100%', height: '100%', border: 0, display: 'block', backgroundColor: Colors.surfaceAlt }}
    />
  );
}
