import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import { ThemedView } from '@/components/themed-view';
import { PARKING_LOT_DEFAULT_COLOR } from '@/constants/parking-map';
import { CAMPUS_POIS } from '@/mocks/campus-pois';

// Same map as the Map tab (CampusMapView), with buildings grayed out and the
// lots as the focus. Every lot is the "no permit selected" red for now; colour
// them by the user's permit by changing `getLotColor` (it receives each CampusLot).
export default function ParkingScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CampusMapView
          pois={CAMPUS_POIS}
          mutedBuildings
          getLotColor={() => PARKING_LOT_DEFAULT_COLOR}
        />
        <ParkingMapLegend />
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
});
