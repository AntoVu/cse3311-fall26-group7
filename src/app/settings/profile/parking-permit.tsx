import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ParkingPermitOptions } from '@/components/parking/parking-permit-options';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSelectedParkingPermit } from '@/state/parking-permit';

export default function ParkingPermitScreen() {
  const selectedPermit = useSelectedParkingPermit();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Parking Permit' }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">Select Parking Permit</ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            Select the parking permit that you currently have, or None if you don&apos;t have one.
            The Parking tab uses it to show where you can park.
          </ThemedText>

          <ParkingPermitOptions />

          <ThemedView type="backgroundElement" style={styles.selectedCard}>
            <ThemedText type="smallBold">Selected Permit</ThemedText>
            <ThemedText>{selectedPermit}</ThemedText>
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
    marginBottom: Spacing.three,
  },
  selectedCard: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 10,
    gap: Spacing.one,
  },
});
