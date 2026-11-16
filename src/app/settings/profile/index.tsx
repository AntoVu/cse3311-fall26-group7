import { Stack, useRouter } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { confirmAction } from '@/components/ui/alert';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { forgetEverything } from '@/state/persist';

/** Deletes everything saved on this device and starts over on the map, like a first visit. */
async function resetMavigator(goToMap: () => void) {
  const ok = await confirmAction(
    'Reset Mavigator?',
    'This deletes your schedule, parking pass, Home, start point, settings and the tips you have seen on this device, and starts over as a new user.',
    'Reset'
  );
  if (!ok) return;
  forgetEverything();
  goToMap();
  window.location.reload();
}

export default function ProfileMenuScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Your Profile' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <SettingsMenuItem
          label="Schedule"
          onPress={() => router.push('/settings/profile/schedule')}
        />
        <SettingsMenuItem
          label="Parking Permit"
          onPress={() => router.push('/settings/profile/parking-permit')}
        />
        <SettingsMenuItem
          label="On-Campus Residence"
          onPress={() => router.push('/settings/profile/residence')}
        />
        {/* Web only: the app saves nothing on native, so there is nothing to reset. */}
        {Platform.OS === 'web' && (
          <SettingsMenuItem label="Reset Mavigator" danger onPress={() => void resetMavigator(() => router.replace('/map'))} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
});
