import { useState } from 'react';
import { Stack } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type TimeFormat = '12-hour' | '24-hour';

const TIME_ZONES = [
  'Device Default',
  'Central Time',
  'Eastern Time',
  'Mountain Time',
  'Pacific Time',
];

export default function TimeStandardScreen() {
  const [timeFormat, setTimeFormat] =
    useState<TimeFormat>('12-hour');

  const [timeZone, setTimeZone] =
    useState('Device Default');

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Time Settings',
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedText type="subtitle">
            Time Standard
          </ThemedText>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.description}
          >
            Choose how time should be displayed in the app.
          </ThemedText>

          <Pressable onPress={() => setTimeFormat('12-hour')}>
            <ThemedView
              type={
                timeFormat === '12-hour'
                  ? 'backgroundSelected'
                  : 'backgroundElement'
              }
              style={styles.option}
            >
              <View style={styles.row}>
                <View>
                  <ThemedText type="smallBold">
                    12-Hour Time
                  </ThemedText>

                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                  >
                    Example: 2:30 PM
                  </ThemedText>
                </View>

                {timeFormat === '12-hour' && (
                  <ThemedText style={styles.checkmark}>
                    ✓
                  </ThemedText>
                )}
              </View>
            </ThemedView>
          </Pressable>

          <Pressable onPress={() => setTimeFormat('24-hour')}>
            <ThemedView
              type={
                timeFormat === '24-hour'
                  ? 'backgroundSelected'
                  : 'backgroundElement'
              }
              style={styles.option}
            >
              <View style={styles.row}>
                <View>
                  <ThemedText type="smallBold">
                    24-Hour Time
                  </ThemedText>

                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                  >
                    Example: 14:30
                  </ThemedText>
                </View>

                {timeFormat === '24-hour' && (
                  <ThemedText style={styles.checkmark}>
                    ✓
                  </ThemedText>
                )}
              </View>
            </ThemedView>
          </Pressable>

          <ThemedText
            type="subtitle"
            style={styles.timeZoneTitle}
          >
            Time Zone
          </ThemedText>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.description}
          >
            Select the time zone used by the app.
          </ThemedText>

          {TIME_ZONES.map((zone) => {
            const isSelected = timeZone === zone;

            return (
              <Pressable
                key={zone}
                onPress={() => setTimeZone(zone)}
              >
                <ThemedView
                  type={
                    isSelected
                      ? 'backgroundSelected'
                      : 'backgroundElement'
                  }
                  style={styles.option}
                >
                  <View style={styles.row}>
                    <ThemedText type="smallBold">
                      {zone}
                    </ThemedText>

                    {isSelected && (
                      <ThemedText style={styles.checkmark}>
                        ✓
                      </ThemedText>
                    )}
                  </View>
                </ThemedView>
              </Pressable>
            );
          })}

          <ThemedView
            type="backgroundElement"
            style={styles.currentSettings}
          >
            <ThemedText type="smallBold">
              Current Settings
            </ThemedText>

            <ThemedText type="small">
              Time Format: {timeFormat}
            </ThemedText>

            <ThemedText type="small">
              Time Zone: {timeZone}
            </ThemedText>
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

  option: {
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