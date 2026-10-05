import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { MapLegend } from '@/components/map/map-legend';
import { PoiInfoSheet } from '@/components/map/poi-info-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { clearPinnedLocation, setPinnedLocation, useUserLocation } from '@/state/user-location';
import type { PointOfInterest } from '@/types/map';

export default function MapScreen() {
  const theme = useTheme();
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const userLocation = useUserLocation();
  const pinned = userLocation?.source === 'pinned';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {pinned ? (
          <View style={styles.banner}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.bannerText}>
              Using a dropped pin as your location
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear dropped pin"
              onPress={clearPinnedLocation}
              style={[styles.clearButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Clear</ThemedText>
            </Pressable>
          </View>
        ) : null}
        <CampusMapView
          pois={CAMPUS_POIS}
          onSelectPoi={setSelectedPoi}
          onLongPressCoordinate={setPinnedLocation}
          userLocation={
            userLocation ? { coordinate: userLocation.coordinate, pinned } : undefined
          }
        />
        <MapLegend />
      </SafeAreaView>
      <PoiInfoSheet poi={selectedPoi} onClose={() => setSelectedPoi(null)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bannerText: { flex: 1 },
  clearButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
  },
});
