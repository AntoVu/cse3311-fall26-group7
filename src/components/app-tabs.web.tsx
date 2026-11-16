import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon, type TabIconName } from '@/components/tab-icons';
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
            <TabButton icon="map">Map</TabButton>
          </TabTrigger>
          <TabTrigger name="schedule" href="/schedule" asChild>
            <TabButton icon="schedule">Schedule</TabButton>
          </TabTrigger>
          <TabTrigger name="parking" href="/parking" asChild>
            <TabButton icon="parking">Parking</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon="settings">Settings</TabButton>
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
}: TabTriggerSlotProps & { icon: TabIconName }) {
  const theme = useTheme();

  return (
    <Pressable {...props} accessibilityRole="tab" style={styles.tabButton}>
      <View style={styles.tabIcon}>
        <TabIcon name={icon} color={isFocused ? theme.text : theme.textSecondary} />
      </View>
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
  tabIcon: {
    marginBottom: Spacing.half,
  },
});
