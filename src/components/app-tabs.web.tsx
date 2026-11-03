import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { Image, ImageSourcePropType, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The web build is the phone build now, so this is a bottom tab bar like the native one,
// laid out in flow (not floating) so it never covers the screen above it.
export default function AppTabs() {
  // web/ holds the 72 px (@3x) art under plain names: the web build only ever loads the file a
  // require names, so the 24 px 1x icons were blurry on phone screens, and Metro can't require a
  // name with "@3x" in it. Drawn at 24 CSS px below.
  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="map" href="/map" asChild>
            <TabButton icon={require('@/assets/images/tabIcons/web/map.png')}>Map</TabButton>
          </TabTrigger>
          <TabTrigger name="schedule" href="/schedule" asChild>
            <TabButton icon={require('@/assets/images/tabIcons/web/schedule.png')}>Schedule</TabButton>
          </TabTrigger>
          <TabTrigger name="parking" href="/parking" asChild>
            <TabButton icon={require('@/assets/images/tabIcons/web/parking.png')}>Parking</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon={require('@/assets/images/tabIcons/web/settings.png')}>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon: ImageSourcePropType }) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <Image
        key={isFocused ? 'on' : 'off'}
        source={icon}
        tintColor={isFocused ? theme.text : theme.textSecondary}
        style={styles.tabIcon}
      />
      <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  return <ThemedView {...props} type="backgroundElement" style={styles.tabList} />;
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  tabList: {
    flexDirection: 'row',
    paddingTop: Spacing.one,
    // Half the iPhone's bottom inset (needs viewport-fit=cover, set in +html.tsx): the home bar only
    // uses its lowest 13 px or so, and the full 34 looked like wasted space. CSS, not
    // useSafeAreaInsets: that reads 0 in the pre-built page, so the bar jumped once JS loaded.
    // env() is 0 on phones with no home bar. The cast: React Native's types don't know calc().
    paddingBottom: `calc(${Spacing.one}px + env(safe-area-inset-bottom) / 2)` as unknown as number,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  tabIcon: {
    width: 24,
    height: 24,
    marginBottom: Spacing.half,
  },
});
