import { router, Slot, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { XrNavigationBar, XrTab } from '@/components/xr-navigation-bar';

const TAB_ROUTES: Record<XrTab, string> = {
  venue:     '/(tabs)/venue',
  volunteer: '/(tabs)/volunteer',
  profile:   '/(tabs)/profile',
};

function pathnameToTab(pathname: string): XrTab {
  if (pathname.includes('volunteer')) return 'volunteer';
  if (pathname.includes('profile')) return 'profile';
  return 'venue';
}

export default function TabsLayout() {
  const pathname = usePathname();
  const activeTab = pathnameToTab(pathname);

  function handleTabPress(tab: XrTab) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace(TAB_ROUTES[tab] as any);
  }

  return (
    <View style={styles.root}>
      {/* Current tab screen */}
      <View style={styles.screen}>
        <Slot />
      </View>

      {/* Floating nav bar */}
      <XrNavigationBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  screen: { flex: 1 },
});
