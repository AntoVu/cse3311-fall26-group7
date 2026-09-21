import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import {
  setThemePreference,
  type ThemePreference,
  useThemePreference,
} from '@/state/theme-preference';

const THEME_OPTIONS: { label: string; description?: string; value: ThemePreference }[] = [
  { label: 'System', description: "Follow the device's light or dark mode", value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function ThemeScreen() {
  const selectedTheme = useThemePreference();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Theme' }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="subtitle">Choose Theme</ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
          Select how you want the app to appear.
        </ThemedText>

        {THEME_OPTIONS.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            description={option.description}
            selected={selectedTheme === option.value}
            onPress={() => setThemePreference(option.value)}
          />
        ))}
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
  description: {
    marginBottom: Spacing.three,
  },
});
