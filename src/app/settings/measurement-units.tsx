import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';

type DistanceUnit = 'Miles' | 'Kilometers' | 'Meters' | 'Yards' | 'Feet';

const DISTANCE_UNITS: DistanceUnit[] = ['Miles', 'Kilometers', 'Meters', 'Yards', 'Feet'];

// Local state only: nothing displays a distance yet, so there is nothing to convert.
export default function MeasurementUnitsScreen() {
  const [selectedUnit, setSelectedUnit] = useState<DistanceUnit>('Miles');

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Measurement Units' }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="subtitle">Distance Units</ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
          Choose how distances are displayed in the app.
        </ThemedText>

        {DISTANCE_UNITS.map((unit) => (
          <OptionRow
            key={unit}
            label={unit}
            selected={selectedUnit === unit}
            onPress={() => setSelectedUnit(unit)}
          />
        ))}

        <ThemedView type="backgroundElement" style={styles.selectedCard}>
          <ThemedText type="smallBold">Selected Unit</ThemedText>
          <ThemedText>{selectedUnit}</ThemedText>
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
  selectedCard: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 10,
    gap: Spacing.one,
  },
});
