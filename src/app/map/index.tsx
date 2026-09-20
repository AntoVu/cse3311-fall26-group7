import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { MapLegend } from '@/components/map/map-legend';
import { PoiInfoSheet } from '@/components/map/poi-info-sheet';
import { ThemedView } from '@/components/themed-view';
import { CAMPUS_POIS } from '@/data/campus-pois';
import type { PointOfInterest } from '@/types/map';

export default function MapScreen() {
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CampusMapView pois={CAMPUS_POIS} onSelectPoi={setSelectedPoi} />
        <MapLegend />
      </SafeAreaView>
      <PoiInfoSheet poi={selectedPoi} onClose={() => setSelectedPoi(null)} />
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
