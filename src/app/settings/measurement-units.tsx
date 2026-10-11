import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import { distanceUnitStore, useDistanceUnit } from '@/state/distance-unit';

export default function MeasurementUnitsScreen() {
  const selectedUnit = useDistanceUnit();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Measurement Units' }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="subtitle">Distance Units</ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
          Choose how distances are displayed in the app.
        </ThemedText>

        {(['imperial', 'metric'] as const).map((unit) => (
          <OptionRow
            key={unit}
            label={unit === 'imperial' ? 'Imperial' : 'Metric'}
            selected={selectedUnit === unit}
            onPress={() => distanceUnitStore.set(unit)}
          />
        ))}

        <ThemedView type="backgroundElement" style={styles.selectedCard}>
          <ThemedText type="smallBold">Selected Unit</ThemedText>
          <ThemedText>{selectedUnit === 'imperial' ? 'Imperial' : 'Metric'}</ThemedText>
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
