import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { MapLegend } from '@/components/map/map-legend';
import { isFullBleed, MapLegendOverlay } from '@/components/map/overlay-layouts';
import { PoiInfoSheet } from '@/components/map/poi-info-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { useOverlayLayout } from '@/state/dev-options';
import { clearPinnedLocation, setPinnedLocation, useUserLocation } from '@/state/user-location';
import type { PointOfInterest } from '@/types/map';

export default function MapScreen() {
  const theme = useTheme();
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const userLocation = useUserLocation();
  const pinned = userLocation?.source === 'pinned';
  const layout = useOverlayLayout();
  const fullBleed = isFullBleed(layout);
  const { top } = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={fullBleed ? [] : ['top']}>
        {pinned ? (
          <View
            style={[
              styles.banner,
              fullBleed && [styles.floatingBanner, { top, backgroundColor: theme.background }],
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
        {layout === 'current' ? <MapLegend /> : <MapLegendOverlay layout={layout} />}
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
  // TEMPORARY (Settings > Developer layouts): the banner floats when the map runs edge to edge.
  floatingBanner: { position: 'absolute', left: 0, right: 0, zIndex: 1 },
  bannerText: { flex: 1 },
  clearButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
  },
});
