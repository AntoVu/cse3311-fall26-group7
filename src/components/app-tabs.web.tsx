import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { Image, ImageSourcePropType, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The web build is the phone build now, so this is a bottom tab bar like the native one,
// laid out in flow (not floating) so it never covers the screen above it.
export default function AppTabs() {
  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="map" href="/map" asChild>
            <TabButton icon={require('@/assets/images/tabIcons/map-v2.png')}>Map</TabButton>
          </TabTrigger>
          <TabTrigger name="schedule" href="/schedule" asChild>
            <TabButton icon={require('@/assets/images/tabIcons/schedule-v2.png')}>Schedule</TabButton>
          </TabTrigger>
          <TabTrigger name="parking" href="/parking" asChild>
            <TabButton icon={require('@/assets/images/tabIcons/parking-v2.png')}>Parking</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon={require('@/assets/images/tabIcons/settings-v2.png')}>Settings</TabButton>
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
        source={icon}
        style={[styles.tabIcon, { tintColor: isFocused ? theme.text : theme.textSecondary }]}
      />
      <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  // Clears the iPhone home bar (needs viewport-fit=cover, set in +html.tsx).
  const { bottom } = useSafeAreaInsets();
  return (
    <ThemedView
      {...props}
      type="backgroundElement"
      style={[styles.tabList, { paddingBottom: Spacing.one + bottom }]}
    />
  );
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
