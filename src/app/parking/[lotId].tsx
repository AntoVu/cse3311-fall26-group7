import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  getParkingPermission,
  PARKING_PERMITS,
  type ParkingPermit,
} from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ParkingLotDetailScreen() {
  const { lotId, permit } = useLocalSearchParams<{
    lotId: string;
    permit?: string;
  }>();
  const lot = CAMPUS_LOTS.find((candidate) => candidate.id === lotId);
  const selectedPermit: ParkingPermit | null =
    PARKING_PERMITS.find((candidate) => candidate === permit) ?? null;

  const permission =
    lot && selectedPermit
      ? getParkingPermission(selectedPermit, lot.id)
      : null;
  const permissionMessage =
    permission === 'allowed'
      ? 'Parking is allowed with this permit.'
      : permission === 'restricted'
        ? 'This permit is not allowed in this lot.'
        : permission === 'timeRestricted'
          ? 'Parking access depends on the current time.'
          : permission === 'checkSigns'
            ? 'Check posted signs for parking restrictions.'
            : 'Parking access is unknown.';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{ headerShown: true, title: lot?.label ?? 'Parking lot' }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {lot ? (
          <>
            <ThemedText type="subtitle">{lot.label}</ThemedText>

            <ThemedText type="small">
              Selected permit: {selectedPermit ?? 'None'}
            </ThemedText>

            <ThemedText type="small">
              {permissionMessage}
            </ThemedText>
          </>
        ) : (
          <ThemedText type="small">Lot not found.</ThemedText>
        )}
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
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
