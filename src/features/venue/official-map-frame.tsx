/**
 * The venue's own map page in a WebView (iOS and Android; web uses official-map-frame.web.tsx).
 * Once it has loaded, a tapped link to another site opens in the in-app browser and a tel:,
 * mailto: or maps link opens its app (rules in frameNavigation).
 */
import * as WebBrowser from 'expo-web-browser';
import { useRef } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors } from '@/constants/theme';

import { frameNavigation, type EmbeddedOfficialMap } from './official-maps';

export interface OfficialMapFrameProps {
  map: EmbeddedOfficialMap;
  /** Read by screen readers in place of the page. */
  label: string;
  onLoad: () => void;
  onError: () => void;
}

export function OfficialMapFrame({ map, label, onLoad, onError }: OfficialMapFrameProps) {
  const loaded = useRef(false);
  return (
    <WebView
      source={{ uri: map.url }}
      style={styles.frame}
      accessibilityLabel={label}
      onLoad={() => {
        loaded.current = true;
        onLoad();
      }}
      onError={onError}
      // Fires for the main frame only, on both platforms. After the page is up, a failing
      // navigation inside it is the page's business.
      onHttpError={e => { if (!loaded.current && e.nativeEvent.statusCode >= 400) onError(); }}
      onShouldStartLoadWithRequest={req => {
        const action = frameNavigation(map, {
          url: req.url,
          isTopFrame: req.isTopFrame,
          navigationType: req.navigationType,
          loaded: loaded.current,
          platform: Platform.OS,
        });
        if (action === 'browser') WebBrowser.openBrowserAsync(req.url).catch(() => {});
        if (action === 'app') Linking.openURL(req.url).catch(() => {});
        return action === 'allow';
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
