import { Stack } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  setThemePreference,
  type ThemePreference,
  useThemePreference,
} from '@/state/theme-preference';

const THEME_OPTIONS: { label: string; description?: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
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

        {THEME_OPTIONS.map((option) => {
          const isSelected = selectedTheme === option.value;

          return (
            <Pressable key={option.value} onPress={() => setThemePreference(option.value)}>
              <ThemedView
                type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.themeOption}>
                <View style={styles.row}>
                  <View>
                    <ThemedText type="smallBold">{option.label}</ThemedText>
                    {option.description && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {option.description}
                      </ThemedText>
                    )}
                  </View>

                  {isSelected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                </View>
              </ThemedView>
            </Pressable>
          );
        })}
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

  themeOption: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  checkmark: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});
