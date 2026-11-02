import { Stack, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { ThemedView } from '@/components/themed-view';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import { staffRoutesStore, useStaffRoutes } from '@/state/staff-routes';

export default function CustomizationScreen() {
  const router = useRouter();
  const staffRoutes = useStaffRoutes();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'App Customization' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <SettingsMenuItem label="Theme" onPress={() => router.push('/settings/theme')} />
        <SettingsMenuItem
          label="Time Standard"
          onPress={() => router.push('/settings/time-standard')}
        />
        <SettingsMenuItem
          label="Measurement Units"
          onPress={() => router.push('/settings/measurement-units')}
        />
        <OptionRow
          role="checkbox"
          label="Staff-only doors"
          description="For UTA staff with a keycard: indoor routes may use doors marked staff-only."
          selected={staffRoutes}
          onPress={() => staffRoutesStore.set(!staffRoutes)}
        />
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
