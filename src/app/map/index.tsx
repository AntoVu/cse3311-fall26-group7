import { useRouter } from 'expo-router';
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
import { setStartPoint } from '@/state/start-point';
import { clearPinnedLocation, setPinnedLocation, useUserLocation } from '@/state/user-location';
import type { Coordinate, PointOfInterest } from '@/types/map';

export default function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const userLocation = useUserLocation();
  const pinned = userLocation?.source === 'pinned';
  const { top } = useSafeAreaInsets();

  // A dropped pin stands in for a GPS fix, so routes start from it ("Current Location").
  const dropPin = (coordinate: Coordinate) => {
    setPinnedLocation(coordinate);
    setStartPoint({ kind: 'currentLocation' });
  };

  return (
    <ThemedView style={styles.container}>
      {/* The map fills the screen, status bar included; everything else floats over it. */}
      <View style={styles.content}>
        {pinned ? (
          <View style={[styles.topBar, { paddingTop: top, backgroundColor: theme.background }]}>
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
          </View>
        ) : null}
        <CampusMapView
          pois={CAMPUS_POIS}
          onSelectPoi={setSelectedPoi}
          onLongPressCoordinate={dropPin}
          userLocation={
            userLocation ? { coordinate: userLocation.coordinate, pinned } : undefined
          }
        />
        <View pointerEvents="box-none" style={styles.legend}>
          <MapLegend />
        </View>
      </View>
      {/* A building or one of its rooms opens the same route screen a class does. */}
      <PoiInfoSheet
        poi={selectedPoi}
        onClose={() => setSelectedPoi(null)}
        onSetDestination={(poi, room) => {
          setSelectedPoi(null);
          router.push({ pathname: '/map/route', params: { building: poi.id, ...(room && { room }) } });
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
