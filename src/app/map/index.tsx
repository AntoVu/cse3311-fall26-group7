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
import { amenityById, buildingsWith, type AmenityId } from '@/routing/amenities';
import { dropPin } from '@/state/start-point';
import { clearPinnedLocation, useUserLocation } from '@/state/user-location';
import type { PointOfInterest } from '@/types/map';

/** How long the map rests on a searched building before its card opens. */
const CARD_DELAY_MS = 500;
/** How long a searched building stays red after its card closes. */
const FOUND_FADE_MS = 3000;

export default function MapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null);
  // A searched building: the map glides there, then its card opens.
  const [flyTo, setFlyTo] = useState<PointOfInterest | null>(null);
  // The searched building, drawn in the destination red so it stands out among its neighbors;
  // it fades back a moment after its card closes.
  const [found, setFound] = useState<string | null>(null);
  // The amenity the search is showing ("vending"): the buildings that have one get its letter.
  const [showing, setShowing] = useState<AmenityId | null>(null);
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
            onPickBuilding={(id) => {
              setFound(id);
              setFlyTo(CAMPUS_POIS.find((poi) => poi.id === id) ?? null);
            }}
            onPickRoom={(building, room) => router.push({ pathname: '/map/route', params: { building, room } })}
            onPickAmenity={(amenity) => router.push({ pathname: '/map/route', params: { amenity } })}
            onShowAmenity={setShowing}
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
          flyTo={flyTo}
          onFlyEnd={() => {
            // A beat on the building before its card covers it.
            const arrived = flyTo;
            setTimeout(() => setSelectedPoi(arrived), CARD_DELAY_MS);
            setFlyTo(null);
          }}
          routeEnds={found ? { destination: found } : undefined}
          badges={showing ? { poiIds: buildingsWith(showing), glyph: amenityById(showing)!.glyph } : undefined}
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
        onClose={() => {
          setSelectedPoi(null);
          // Only clears this search's red, not a newer one's.
          const shown = found;
          setTimeout(() => setFound((current) => (current === shown ? null : current)), FOUND_FADE_MS);
        }}
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
