import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { MAP_OVERLAY_BOTTOM, MapLegend, overlaySurface } from '@/components/map/map-legend';
import { OVERLAY_EDGE } from '@/components/map/map-overlays';
import { MapSearch } from '@/components/map/map-search';
import { PoiInfoSheet } from '@/components/map/poi-info-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { dropPin } from '@/state/start-point';
import { clearPinnedLocation, useUserLocation } from '@/state/user-location';
import type { PointOfInterest } from '@/types/map';

export default function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  const userLocation = useUserLocation();
  const pinned = userLocation?.source === 'pinned';
  const { top } = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      {/* The map fills the screen, status bar included; everything else floats over it. */}
      <View style={styles.content}>
        {/* Floats below the status bar like the other map chips, clear of iOS's blur under it. */}
        <View pointerEvents="box-none" style={[styles.topBar, { top: top + OVERLAY_EDGE }]}>
          <MapSearch
            onPickBuilding={(id) => setSelectedPoi(CAMPUS_POIS.find((poi) => poi.id === id) ?? null)}
            onPickRoom={(building, room) => router.push({ pathname: '/map/route', params: { building, room } })}
          />
          {pinned ? (
            <View style={[styles.banner, overlaySurface(theme.backgroundElement)]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.bannerText}>
                Using a dropped pin as your location
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear dropped pin"
                onPress={clearPinnedLocation}
                style={[styles.clearButton, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">Clear</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
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
    left: OVERLAY_EDGE,
    right: OVERLAY_EDGE,
    zIndex: 1,
    gap: Spacing.two,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  bannerText: { flex: 1 },
  legend: { position: 'absolute', left: 12, right: 12, bottom: MAP_OVERLAY_BOTTOM + 12 },
  clearButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 16,
  },
});
