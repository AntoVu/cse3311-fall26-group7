import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type DistanceUnit =
  | 'Miles'
  | 'Kilometers'
  | 'Meters'
  | 'Yards'
  | 'Feet';

const DISTANCE_UNITS: DistanceUnit[] = [
  'Miles',
  'Kilometers',
  'Meters',
  'Yards',
  'Feet',
];

export default function MeasurementUnitsScreen() {
  const [selectedUnit, setSelectedUnit] =
    useState<DistanceUnit>('Miles');

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Measurement Units',
        }}
      />

      <SafeAreaView
        style={styles.safeArea}
        edges={['bottom']}
      >
        <ThemedText type="subtitle">
          Distance Units
        </ThemedText>

        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.description}
        >
          Choose how distances are displayed in the app.
        </ThemedText>

        {DISTANCE_UNITS.map((unit) => {
          const isSelected = selectedUnit === unit;

          return (
            <Pressable
              key={unit}
              onPress={() => setSelectedUnit(unit)}
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
                    {unit}
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
          style={styles.selectedCard}
        >
          <ThemedText type="smallBold">
            Selected Unit
          </ThemedText>

          <ThemedText>
            {selectedUnit}
          </ThemedText>
        </ThemedView>
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

  selectedCard: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 10,
    gap: Spacing.one,
  },
});