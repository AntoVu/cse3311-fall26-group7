import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LotStatusBadge } from '@/components/parking/lot-status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MOCK_PARKING_LOTS } from '@/mocks/parking';

export default function ParkingLotDetailScreen() {
  const { lotId } = useLocalSearchParams<{ lotId: string }>();
  const lot = MOCK_PARKING_LOTS.find((candidate) => candidate.id === lotId);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: lot?.name ?? 'Parking lot' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {lot ? (
          <>
            <ThemedText type="subtitle">{lot.name}</ThemedText>
            <LotStatusBadge status={lot.status} />
            {lot.description ? <ThemedText type="small">{lot.description}</ThemedText> : null}
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
