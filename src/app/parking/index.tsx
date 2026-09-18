import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ParkingLotTile } from '@/components/parking/parking-lot-tile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  MOCK_CURRENT_PERMIT,
  MOCK_DISTANCE_TO_FIRST_CLASS_MILES,
  MOCK_FIRST_CLASS_LABEL,
  MOCK_PARKING_LOTS,
  MOCK_RECOMMENDED_LOT_ID,
  MOCK_WALK_MINUTES_TO_FIRST_CLASS,
} from '@/mocks/parking';
import type { ParkingLot } from '@/mocks/parking';

export default function ParkingScreen() {
  const router = useRouter();
  const recommendedLot = MOCK_PARKING_LOTS.find((lot) => lot.id === MOCK_RECOMMENDED_LOT_ID);
  const availableLots = MOCK_PARKING_LOTS.filter((lot) => lot.status !== 'notAllowed');

  const handleSelectLot = (lot: ParkingLot) => {
    router.push({ pathname: '/parking/[lotId]', params: { lotId: lot.id } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Parking
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Current Permit: {MOCK_CURRENT_PERMIT}
        </ThemedText>

        <View style={styles.grid}>
          {MOCK_PARKING_LOTS.map((lot) => (
            <ParkingLotTile key={lot.id} lot={lot} onPress={handleSelectLot} />
          ))}
        </View>

        <ThemedView type="backgroundElement" style={styles.summaryCard}>
          <ThemedText type="small">First class: {MOCK_FIRST_CLASS_LABEL}</ThemedText>
          <ThemedText type="small">
            Available: {availableLots.map((lot) => lot.name).join(', ')}
          </ThemedText>
          {recommendedLot ? (
            <ThemedText type="small">Recommended Parking: {recommendedLot.name}</ThemedText>
          ) : null}
          <ThemedText type="small">
            Distance to first class: {MOCK_DISTANCE_TO_FIRST_CLASS_MILES} miles (
            {MOCK_WALK_MINUTES_TO_FIRST_CLASS} min)
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
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
