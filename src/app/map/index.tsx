import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { MAP_OVERLAY_BOTTOM, MapLegend } from '@/components/map/map-legend';
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
  const { top } = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      {/* The map fills the screen, status bar included; everything else floats over it. */}
      <View style={styles.content}>
        {pinned ? (
          <View
            style={[
              styles.banner,
              { paddingTop: top + Spacing.two, backgroundColor: theme.background },
            ]}>
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
        <View pointerEvents="box-none" style={styles.legend}>
          <MapLegend />
        </View>
      </View>
      <PoiInfoSheet poi={selectedPoi} onClose={() => setSelectedPoi(null)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bannerText: { flex: 1 },
  legend: { position: 'absolute', left: 12, right: 12, bottom: MAP_OVERLAY_BOTTOM + 12 },
  clearButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
  },
});
