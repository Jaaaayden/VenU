/**
 * The venue's own map page in a WebView (iOS and Android; web uses official-map-frame.web.tsx).
 * Links that leave the venue's site open in the in-app browser instead of replacing the map.
 */
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors } from '@/constants/theme';

import { staysInFrame } from './official-maps';

export interface OfficialMapFrameProps {
  url: string;
  /** Read by screen readers in place of the page. */
  label: string;
  onLoad: () => void;
  onError: () => void;
}

export function OfficialMapFrame({ url, label, onLoad, onError }: OfficialMapFrameProps) {
  return (
    <WebView
      source={{ uri: url }}
      style={styles.frame}
      accessibilityLabel={label}
      onLoad={onLoad}
      onError={onError}
      // Only a failing page counts, not one of its many images or trackers.
      onHttpError={e => { if (e.nativeEvent.statusCode >= 400 && e.nativeEvent.url === url) onError(); }}
      onShouldStartLoadWithRequest={req => {
        if (req.isTopFrame === false || staysInFrame(url, req.url)) return true;
        void WebBrowser.openBrowserAsync(req.url);
        return false;
      }}
      setSupportMultipleWindows={false}
      allowsInlineMediaPlayback
      nestedScrollEnabled
    />
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: Colors.surfaceAlt },
});
