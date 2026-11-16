import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Settings
        </ThemedText>
        <SettingsMenuItem label="Your Profile" onPress={() => router.push('/settings/profile')} />
        <SettingsMenuItem
          label="App Customization"
          onPress={() => router.push('/settings/customization')}
        />
        <SettingsMenuItem label="How to use Mavigator" onPress={() => router.push('/settings/help')} />
        <SettingsMenuItem label="About" onPress={() => router.push('/settings/about')} />
        {/* Desk-testing switches: on the dev server (localhost, LAN, tunnel), never on the live site. */}
        {__DEV__ && (
          <SettingsMenuItem label="Developer" onPress={() => router.push('/settings/developer')} />
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
  title: {
    marginBottom: Spacing.two,
  },
});
