import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import { timeFormatStore, useTimeFormat, type TimeFormat } from '@/state/time-format';

const TIME_FORMATS: { value: TimeFormat; label: string; description: string }[] = [
  { value: '12-hour', label: '12-Hour Time', description: 'Example: 2:30 PM' },
  { value: '24-hour', label: '24-Hour Time', description: 'Example: 14:30' },
];

export default function TimeStandardScreen() {
  const timeFormat = useTimeFormat();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Time Settings' }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">Time Standard</ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            Choose how time should be displayed in the app.
          </ThemedText>

          {TIME_FORMATS.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              description={option.description}
              selected={timeFormat === option.value}
              onPress={() => timeFormatStore.set(option.value)}
            />
          ))}

          <ThemedView type="backgroundElement" style={styles.currentSettings}>
            <ThemedText type="smallBold">Current Settings</ThemedText>
            <ThemedText type="small">Time Format: {timeFormat}</ThemedText>
          </ThemedView>
        </ScrollView>
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
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  description: {
    marginBottom: Spacing.two,
  },
  currentSettings: {
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: 10,
    gap: Spacing.one,
  },
});
