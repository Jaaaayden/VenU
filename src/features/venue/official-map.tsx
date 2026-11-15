/**
 * A venue's own map in place of the schematic one: the source line ("Map: SoFi Stadium · Open in
 * browser") on top, then the venue's interactive map page or its published images. The facility
 * sheet still slides over the bottom, so the accessible list stays one swipe away.
 */
import { Image } from 'expo-image';
import * as Network from 'expo-network';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Colors, Fonts, Spacing, Type } from '@/constants/theme';
import { useT } from '@/i18n';

import { OfficialMapFrame } from './official-map-frame';
import { OfficialMapViewer } from './official-map-viewer';
import type { EmbeddedOfficialMap, ImageOfficialMap, OfficialMap, OfficialMapViewId } from './official-maps';

/** After this long without a load event, say it failed (the frame stays, in case it arrives late). */
const LOAD_TIMEOUT_MS = 45000;
/** Behind white text laid over a map image. */
const SCRIM = 'rgba(0,0,0,0.6)';

type Status = 'loading' | 'ready' | 'error';

function openInBrowser(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => {});
}

export function OfficialMapPanel({ map }: { map: OfficialMap }) {
  return (
    <View style={styles.panel}>
      <SourceBar map={map} />
      {map.kind === 'embed' ? <EmbeddedMap map={map} /> : <ImageMaps map={map} />}
    </View>
  );
}

/** "Map: SoFi Stadium" and the link to the venue's own page. */
function SourceBar({ map }: { map: OfficialMap }) {
  const t = useT('venue');
  return (
    <View style={styles.sourceBar}>
      <Text style={styles.source} numberOfLines={1}>{t('officialMap.attribution', { source: map.source })}</Text>
      <Pressable
        onPress={() => openInBrowser(map.pageUrl)}
        hitSlop={8}
        style={({ pressed }) => [styles.openLink, pressed && styles.pressed]}
        accessibilityRole="link"
        accessibilityLabel={t('officialMap.openLabel', { source: map.source })}>
        <Text style={styles.openText} numberOfLines={1}>{t('officialMap.open')}</Text>
      </Pressable>
    </View>
  );
}

function EmbeddedMap({ map }: { map: EmbeddedOfficialMap }) {
  const t = useT('venue');
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  // Offline, say so at once rather than after the timeout.
  useEffect(() => {
    let live = true;
    void isOffline().then(offline => { if (live && offline) setStatus('error'); });
    return () => { live = false; };
  }, [attempt]);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus(s => (s === 'loading' ? 'error' : s)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status, attempt]);

  const retry = () => {
    setStatus('loading');
    setAttempt(a => a + 1);
  };

  return (
    <View style={styles.body}>
      <OfficialMapFrame
        key={attempt}
        map={map}
        label={t('officialMap.frameLabel', { source: map.source })}
        // Offline, the frame still "loads": the browser's own error page.
        onLoad={() => { void isOffline().then(offline => setStatus(offline ? 'error' : 'ready')); }}
        onError={() => setStatus('error')}
      />
      {status === 'loading' ? (
        <View style={styles.cover} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.coverText}>{t('officialMap.loading', { source: map.source })}</Text>
          <Button label={t('officialMap.open')} variant="link" onPress={() => openInBrowser(map.pageUrl)} accessibilityHint={t('officialMap.openLabel', { source: map.source })} />
        </View>
      ) : null}
      {status === 'error' ? <LoadError map={map} onRetry={retry} /> : null}
    </View>
  );
}

function LoadError({ map, onRetry }: { map: OfficialMap; onRetry: () => void }) {
  const t = useT('venue');
  return (
    <View style={styles.cover} accessibilityLiveRegion="polite">
      <Text style={styles.coverText} accessibilityRole="alert">{t('officialMap.error')}</Text>
      <Button label={t('officialMap.open')} onPress={() => openInBrowser(map.pageUrl)} accessibilityHint={t('officialMap.openLabel', { source: map.source })} />
      <Button label={t('officialMap.retry')} variant="link" onPress={onRetry} />
    </View>
  );
}

/** The published images, one at a time, with a switch between views and tap to enlarge. */
function ImageMaps({ map }: { map: ImageOfficialMap }) {
  const t = useT('venue');
  const [viewId, setViewId] = useState<OfficialMapViewId>(map.images[0].id);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const image = map.images.find(i => i.id === viewId) ?? map.images[0];
  const viewName = t(`officialMap.views.${image.id}`);

  const pick = (id: OfficialMapViewId) => {
    if (id === viewId) return;
    setViewId(id);
    setStatus('loading');
  };

  return (
    <View style={styles.body}>
      {map.images.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.viewsScroll}
          contentContainerStyle={styles.views}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('officialMap.viewsLabel')}>
          {map.images.map(i => (
            <Chip key={i.id} label={t(`officialMap.views.${i.id}`)} role="radio" selected={i.id === viewId} onPress={() => pick(i.id)} />
          ))}
        </ScrollView>
      ) : null}
      {/* Covers stay inside the image box, so the view chips above remain usable. */}
      <View style={styles.imageBox}>
        <Pressable
          onPress={() => setEnlarged(true)}
          disabled={status !== 'ready'}
          style={styles.image}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('officialMap.imageLabel', { view: viewName, source: map.source })}
          accessibilityHint={t('officialMap.enlargeHint')}>
          <Image
            key={`${image.id}-${attempt}`}
            source={{ uri: image.url, width: image.width, height: image.height }}
            style={styles.image}
            contentFit="contain"
            transition={150}
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
            accessible={false}
          />
          {status === 'ready' ? (
            <View style={styles.enlargeBadge} pointerEvents="none">
              <Text style={styles.enlargeText}>{t('officialMap.enlarge')}</Text>
            </View>
          ) : null}
        </Pressable>
        {status === 'loading' ? (
          <View style={[styles.cover, styles.coverDark]} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.onPrimary} />
          </View>
        ) : null}
        {status === 'error' ? (
          <LoadError map={map} onRetry={() => { setStatus('loading'); setAttempt(a => a + 1); }} />
        ) : null}
      </View>
      <OfficialMapViewer
        visible={enlarged}
        onClose={() => setEnlarged(false)}
        image={image}
        title={`${map.source} · ${viewName}`}
        label={t('officialMap.imageLabelZoom', { view: viewName, source: map.source })}
      />
    </View>
  );
}

/** No connection, or one that can't reach the internet. Unknown counts as online. */
async function isOffline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === false || state.isInternetReachable === false;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  panel: { flex: 1, backgroundColor: Colors.surfaceAlt },
  sourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 40,
    paddingHorizontal: Spacing.gutter,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  source: { ...Type.caption, flex: 1 },
  openLink: { minHeight: 40, justifyContent: 'center' },
  openText: { fontFamily: Fonts.textBold, fontSize: 14, lineHeight: 18, color: Colors.primary, textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
  body: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceAlt,
  },
  coverDark: { backgroundColor: 'transparent' },
  coverText: { ...Type.body, textAlign: 'center', color: Colors.textMuted },
  viewsScroll: { flexGrow: 0, flexShrink: 0 },
  views: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter, paddingVertical: Spacing.sm },
  imageBox: { flex: 1, backgroundColor: Colors.ink },
  image: { flex: 1 },
  enlargeBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    backgroundColor: SCRIM,
  },
  enlargeText: { fontFamily: Fonts.textBold, fontSize: 13, lineHeight: 17, color: Colors.onPrimary },
});
