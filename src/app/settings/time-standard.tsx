import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';

type TimeFormat = '12-hour' | '24-hour';

const TIME_FORMATS: { value: TimeFormat; label: string; description: string }[] = [
  { value: '12-hour', label: '12-Hour Time', description: 'Example: 2:30 PM' },
  { value: '24-hour', label: '24-Hour Time', description: 'Example: 14:30' },
];

const TIME_ZONES = [
  'Device Default',
  'Central Time',
  'Eastern Time',
  'Mountain Time',
  'Pacific Time',
];

// Local state only: every time in the app is still formatted by time-format.ts on a 12-hour
// clock in the device's zone. Wiring these up is Iteration 2+ work.
export default function TimeStandardScreen() {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12-hour');
  const [timeZone, setTimeZone] = useState('Device Default');

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
              onPress={() => setTimeFormat(option.value)}
            />
          ))}

          <ThemedText type="subtitle" style={styles.timeZoneTitle}>
            Time Zone
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            Select the time zone used by the app.
          </ThemedText>

          {TIME_ZONES.map((zone) => (
            <OptionRow
              key={zone}
              label={zone}
              selected={timeZone === zone}
              onPress={() => setTimeZone(zone)}
            />
          ))}

          <ThemedView type="backgroundElement" style={styles.currentSettings}>
            <ThemedText type="smallBold">Current Settings</ThemedText>
            <ThemedText type="small">Time Format: {timeFormat}</ThemedText>
            <ThemedText type="small">Time Zone: {timeZone}</ThemedText>
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
  timeZoneTitle: {
    marginTop: Spacing.four,
  },
  currentSettings: {
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: 10,
    gap: Spacing.one,
  },
});
