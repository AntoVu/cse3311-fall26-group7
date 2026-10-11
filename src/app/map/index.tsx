import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CAMPUS_LOTS } from '@/data/campus-lots';
import { campusGraph } from '@/routing/campus-graph';
import { findRoute } from '@/routing/route';
import { resolveStartPoint } from '@/routing/start-point';
import { useStartPoint } from '@/state/start-point';
import { formatDistance, formatDuration } from '@/routing/format';

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
  const [destination, setDestination] = useState<PointOfInterest | null>(null);
  const userLocation = useUserLocation();
  const pinned = userLocation?.source === 'pinned';
  const startPoint = useStartPoint();

  const start = pinned && userLocation
    ? {
      label: 'Dropped Pin',
      coordinate: userLocation.coordinate,
    }
    : startPoint
      ? resolveStartPoint(startPoint, {
        pois: CAMPUS_POIS,
        lots: CAMPUS_LOTS,
        userLocation: userLocation?.coordinate ?? null,
      })
      : null;

  const route =
    destination && start
      ? findRoute(campusGraph, start.coordinate, destination.coordinate)
      : null;

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
        {destination && (
          <View style={styles.routeBanner}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">
                Destination: {destination.name}
              </ThemedText>

              <ThemedText type="small">
                {!startPoint && !pinned
                  ? 'Choose a starting point or long-press the map to drop a pin.'
                  : !start
                    ? 'Starting point unavailable. Choose another starting point.'
                    : route
                      ? `${formatDistance(route.totalDistanceMeters)} · ${formatDuration(route.etaMinutes)} walk`
                      : 'No walking route found.'}
              </ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear destination"
              onPress={() => setDestination(null)}
              style={styles.clearButton}>
              <ThemedText type="smallBold">Clear</ThemedText>
            </Pressable>
          </View>
        )}

        <CampusMapView
          pois={CAMPUS_POIS}
          onSelectPoi={setSelectedPoi}
          onLongPressCoordinate={setPinnedLocation}
          userLocation={
            userLocation ? { coordinate: userLocation.coordinate, pinned } : undefined
          }
          route={route?.path}
        />
        <MapLegend />
      </SafeAreaView>
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
  safeArea: { flex: 1 },
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
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
