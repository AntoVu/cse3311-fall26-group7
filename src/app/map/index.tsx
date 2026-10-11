import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { MAP_OVERLAY_BOTTOM, MapLegend } from '@/components/map/map-legend';
import { PoiInfoSheet } from '@/components/map/poi-info-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { campusGraph } from '@/routing/campus-graph';
import { formatDistance, formatDuration } from '@/routing/format';
import { findRoute } from '@/routing/route';
import { resolveStartPoint } from '@/routing/start-point';
import { useDistanceUnit } from '@/state/distance-unit';
import { useStartPoint } from '@/state/start-point';
import { clearPinnedLocation, setPinnedLocation, useUserLocation } from '@/state/user-location';
import type { PointOfInterest } from '@/types/map';

export default function MapScreen() {
  const theme = useTheme();
  const unit = useDistanceUnit();
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const [destination, setDestination] = useState<PointOfInterest | null>(null);
  const userLocation = useUserLocation();
  const pinned = userLocation?.source === 'pinned';
  const startPoint = useStartPoint();
  const { top } = useSafeAreaInsets();

  const start =
    pinned && userLocation
      ? { label: 'Dropped Pin', coordinate: userLocation.coordinate }
      : startPoint
        ? resolveStartPoint(startPoint, {
            pois: CAMPUS_POIS,
            lots: CAMPUS_LOTS,
            userLocation: userLocation?.coordinate ?? null,
          })
        : null;

  // toPoiId ends the route at the building's nearest door rather than its center.
  const route =
    destination && start
      ? findRoute(campusGraph, start.coordinate, destination.coordinate, {
          toPoiId: destination.id,
          // Leaving from a building starts at its nearest door, as on the class route screen.
          fromPoiId: startPoint?.kind === 'building' && !pinned ? startPoint.poiId : undefined,
        })
      : null;

  return (
    <ThemedView style={styles.container}>
      {/* The map fills the screen, status bar included; everything else floats over it. */}
      <View style={styles.content}>
        {pinned || destination ? (
          <View style={[styles.topBar, { paddingTop: top, backgroundColor: theme.background }]}>
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
            {destination ? (
              <View style={styles.banner}>
                <View style={styles.bannerText}>
                  <ThemedText type="smallBold">Destination: {destination.name}</ThemedText>
                  <ThemedText type="small">
                    {!startPoint && !pinned
                      ? 'Choose a starting point or long-press the map to drop a pin.'
                      : !start
                        ? 'Starting point unavailable. Choose another starting point.'
                        : route
                          ? `${formatDistance(route.totalDistanceMeters, unit)} · ${formatDuration(route.etaMinutes)} walk`
                          : 'No walking route found.'}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear destination"
                  onPress={() => setDestination(null)}
                  style={[styles.clearButton, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">Clear</ThemedText>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
        <CampusMapView
          pois={CAMPUS_POIS}
          onSelectPoi={setSelectedPoi}
          onLongPressCoordinate={setPinnedLocation}
          userLocation={
            userLocation ? { coordinate: userLocation.coordinate, pinned } : undefined
          }
          route={route?.path}
          routeEnds={route ? { start: start?.placeId, destination: destination?.id } : undefined}
        />
        <View pointerEvents="box-none" style={styles.legend}>
          <MapLegend />
        </View>
      </View>
      <PoiInfoSheet
        poi={selectedPoi}
        onClose={() => setSelectedPoi(null)}
        onSetDestination={(poi) => {
          setDestination(poi);
          setSelectedPoi(null);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  banner: {
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
