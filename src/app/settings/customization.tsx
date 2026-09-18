import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function CustomizationScreen() {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'App Customization' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <SettingsMenuItem label="Theme" disabled onPress={() => {}} />
        <SettingsMenuItem label="Time Standard" disabled onPress={() => {}} />
        <SettingsMenuItem label="Measurement Units" disabled onPress={() => {}} />
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
