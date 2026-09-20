import { Stack, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

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
        <SettingsMenuItem label="On-Campus Residence" disabled onPress={() => {}} />
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
