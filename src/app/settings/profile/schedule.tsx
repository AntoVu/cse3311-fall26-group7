import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function ProfileScheduleScreen() {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Schedule' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <SettingsMenuItem label="Import MyMav Schedule" disabled onPress={() => {}} />
        <SettingsMenuItem label="Manual Input" disabled onPress={() => {}} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          Schedule import is coming in a later iteration.
        </ThemedText>
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
  note: {
    marginTop: Spacing.two,
  },
});
