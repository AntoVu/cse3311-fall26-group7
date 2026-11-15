import { useIsFocused, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { overlaySurface } from '@/components/map/map-legend';
import { MapDrawer, OVERLAY_EDGE, OverlayChip } from '@/components/map/map-overlays';
import { DirectionList } from '@/components/routing/route-directions';
import { StartPointSheet } from '@/components/routing/start-point-sheet';
import { Tip } from '@/components/onboarding/tip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { ROUTE_COLORS } from '@/constants/routing';
import { Spacing } from '@/constants/theme';
import { findBuilding } from '@/data/buildings';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { usePlaceRoute, type RouteTarget } from '@/hooks/use-place-route';
import { useTheme } from '@/hooks/use-theme';
import { amenityById, amenityPlace } from '@/routing/amenities';
import { hasIndoorData } from '@/routing/campus-graph';
import { routeDirections } from '@/routing/directions';
import type { TravelMode } from '@/routing/eta';
import { floorLabel, unmappedFloorOf } from '@/routing/floors';
import { crowdNote } from '@/routing/foot-traffic';
import { formatDistance, formatDuration } from '@/routing/format';
import { insideRing } from '@/routing/geo';
import { entranceSide, legTimes, type RouteLegs } from '@/routing/legs';
import { avoidCrowdsStore, useAvoidCrowds } from '@/state/avoid-crowds';
import { useDistanceUnit, type DistanceUnit } from '@/state/distance-unit';
import { dropPin } from '@/state/start-point';
import { useUserLocation } from '@/state/user-location';

type RouteScreenProps = {
  /** Where to; null when the class or place it came from no longer exists. */
  target: RouteTarget | null;
  /** The drawer's first line: the class (course, room, time) or the place. */
  title: string;
  /** The indoor screen for the same target, in this tab's stack. */
  indoorHref: Href;
  /** Where Back goes when there is nothing to pop (a deep link). */
  backHref: Href;
};

/**
 * The outdoor leg of a walk: from the start point to the building's door, walking or biking.
 * Shared by every tab that routes somewhere (a class from the Schedule, a building or room from
 * the Map); the route files only say where to. Laid out like the Map and Parking tabs: the map
 * fills the screen, status bar included, with chips along the top and a drawer at the bottom.
 * Inside the building is the indoor screen ("Go inside").
 */
export function RouteScreen({ target: wanted, title, indoorHref, backHref }: RouteScreenProps) {
  // The build pre-renders this page with no URL params: show nothing until hydrated (#418).
  const hasHydrated = useHasHydrated();
  const target = hasHydrated ? wanted : null;
  const router = useRouter();
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const { startPoint, start, destination, room, route, legs, staffOnly, crowds, loading, building } = usePlaceRoute(target);
  const avoidCrowds = useAvoidCrowds();
  const [isStartSheetVisible, setIsStartSheetVisible] = useState(false);
  const [mode, setMode] = useState<TravelMode>('walking');
  const unit = useDistanceUnit();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // UC-02: a walk through a busy area asks whether to go around; "Keep" hides the question.
  const [keepRoute, setKeepRoute] = useState(false);
  const askGoAround = !avoidCrowds && !keepRoute && crowds.through.length > 0;
  // UC-05: GPS (or a dropped pin) inside the building offers the indoor screen. Offered, not
  // automatic: a fix drifting past a wall shouldn't move the user to another screen.
  const userLocation = useUserLocation();
  const isInside =
    !!userLocation && !!destination?.footprints.some((ring) => insideRing(ring, userLocation.coordinate));

  // Starting inside the building leaves nothing to walk outdoors: go straight to the inside.
  // Only while this screen is showing: the start point can change from another tab.
  const isFocused = useIsFocused();
  const startsInside = !!legs && !legs.outdoor && !!legs.indoor;
  useEffect(() => {
    if (isFocused && startsInside) router.replace(indoorHref);
  }, [isFocused, startsInside, indoorHref, router]);

  // Back within this tab's stack; opened from elsewhere (or a deep link), to backHref.
  const goBack = () => (router.canDismiss() ? router.dismiss() : router.replace(backHref));
  const entranceName =
    destination && legs?.entrance
      ? `${destination.name} (${entranceSide(legs.entrance.coordinate, destination.coordinate)} entrance)`
      : destination?.name;
  const wantedRoom = target && 'room' in target ? target.room : undefined;
  const amenity = target && 'amenity' in target ? target.amenity : undefined;
  const missingRoom = !!destination && !!wantedRoom && !!route && !room && hasIndoorData(destination.id);
  const unmappedFloor = missingRoom && unmappedFloorOf(building(destination.id)?.plans, wantedRoom);

  return (
    <ThemedView style={styles.container}>
      <CampusMapView
        pois={CAMPUS_POIS}
        mutedBuildings
        route={legs?.outdoor?.path}
        routeEnds={legs?.outdoor ? { start: start?.placeId, destination: destination?.id } : undefined}
        crowdZones={crowds.busy}
        // Long-press drops a pin and starts the route there, as on the Map tab.
        onLongPressCoordinate={dropPin}
        userLocation={
          userLocation ? { coordinate: userLocation.coordinate, pinned: userLocation.source === 'pinned' } : undefined
        }
      />

      <View pointerEvents="box-none" style={[styles.topRow, { top: top + OVERLAY_EDGE }]}>
        <OverlayChip onPress={goBack} accessibilityLabel="Back" style={styles.backChip}>
          <ThemedText type="smallBold" style={styles.backText}>
            ‹
          </ThemedText>
        </OverlayChip>
        {target ? (
          <OverlayChip
            onPress={() => setIsStartSheetVisible(true)}
            accessibilityLabel={
              start ? `Starting from ${start.label}. Tap to change it.` : 'Choose a starting point'
            }>
            <ThemedText type="smallBold" numberOfLines={1}>
              {start ? `From ${start.label}` : 'Choose a start'} ▾
            </ThemedText>
          </OverlayChip>
        ) : null}
        {target ? (
          <View
            accessibilityRole="radiogroup"
            style={[styles.modeToggle, overlaySurface(theme.backgroundElement)]}>
            {(['walking', 'biking'] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected: mode === option }}
                onPress={() => setMode(option)}
                style={[styles.modeOption, mode === option && { backgroundColor: theme.background }]}>
                <ThemedText type="smallBold" themeColor={mode === option ? 'text' : 'textSecondary'}>
                  {option === 'walking' ? 'Walk' : 'Bike'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      <MapDrawer
        open={isDrawerOpen}
        onToggle={() => setIsDrawerOpen((open) => !open)}
        label="directions"
        header={
          <>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.centered}>
              {!hasHydrated ? '' : amenity ? amenityPlace(amenity, destination, room?.room) : title}
            </ThemedText>
            {target ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={isDrawerOpen ? undefined : 1}
                style={styles.centered}>
                {summaryFor({
                  startPoint,
                  start,
                  destination,
                  route,
                  legs,
                  mode,
                  unit,
                  loading,
                  staffRoom: staffOnly ? wantedRoom : undefined,
                  lookingFor: amenity && amenityById(amenity)!.label,
                })}
              </ThemedText>
            ) : null}
          </>
        }
        footer={
          <>
            {askGoAround ? (
              <View style={styles.askRow}>
                <ThemedText type="small" style={styles.crowdNote}>
                  {crowdNote(false, crowds, mode)} Go around?
                </ThemedText>
                <Chip label="Go around" selected onPress={() => avoidCrowdsStore.set(true)} />
                <Chip label="Keep" onPress={() => setKeepRoute(true)} />
              </View>
            ) : null}
            {legs?.indoor && room ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(indoorHref)}
                style={({ pressed }) => [styles.insideButton, isInside && styles.insideNow, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.insideButtonText}>
                  {isInside ? `You're in ${destination?.name} · ` : ''}Go inside ▸{' '}
                  {room.room ? `Room ${room.room}` : amenity ? amenityById(amenity)!.label : 'Inside'}
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        }>
        {target ? (
          <View style={styles.crowdRow}>
            <Chip
              label="Avoid crowds"
              selected={avoidCrowds}
              accessibilityLabel={avoidCrowds ? 'Avoid crowds is on. Tap to turn it off.' : 'Avoid crowds is off. Tap to turn it on.'}
              onPress={() => avoidCrowdsStore.set(!avoidCrowds)}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.crowdNote}>
              {crowdNote(avoidCrowds, crowds, mode)}
            </ThemedText>
          </View>
        ) : null}
        {missingRoom ? (
          <ThemedText type="small" themeColor="textSecondary">
            {unmappedFloor
              ? `${floorLabel(unmappedFloor)} isn't mapped yet, so the route to Room ${wantedRoom} ends at the building.`
              : `Room ${wantedRoom} is not on the indoor map yet, so this ends at the building.`}
          </ThemedText>
        ) : null}
        {legs?.outdoor ? (
          <DirectionList
            steps={routeDirections(legs.outdoor.path, {
              pathNodes: legs.outdoor.pathNodes,
              destinationName: entranceName,
              buildingName: (poiId) => findBuilding(poiId)?.name,
            })}
          />
        ) : null}
      </MapDrawer>

      {target ? (
        <Tip
          id="route-start"
          text="Tap “From …” to change where you start: your location, Home, a building, a lot or a dropped pin."
          style={[styles.tip, { top: top + OVERLAY_EDGE + 56 }]}
        />
      ) : null}

      <StartPointSheet
        visible={isStartSheetVisible}
        onClose={() => setIsStartSheetVisible(false)}
      />
    </ThemedView>
  );
}

/** One line saying either how far the walk is, or exactly what is stopping us working it out. */
function summaryFor({
  startPoint,
  start,
  destination,
  route,
  legs,
  mode,
  unit,
  loading,
  staffRoom,
  lookingFor,
}: {
  startPoint: unknown;
  start: { label: string } | null;
  destination: unknown;
  route: { totalDistanceMeters: number } | null;
  legs: RouteLegs | null;
  mode: TravelMode;
  unit: DistanceUnit;
  /** The building's indoor map is still downloading. */
  loading: boolean;
  /** Set when the route is to the nearest amenity: its name ("Vending machine"). */
  lookingFor?: string;
  /** Set when the room is reachable only through a staff-only hallway. */
  staffRoom?: string;
}): string {
  if (!destination && !lookingFor) return 'That building is not on the map.';
  if (!startPoint) return 'Pick a starting point to see the walk there.';
  if (loading) return 'Loading the indoor map…';
  if (!start) return 'That starting point is unavailable right now. Pick another.';
  if (!destination) return `No ${lookingFor!.toLowerCase()} on the indoor maps can be reached from here.`;
  if (staffRoom) return `Room ${staffRoom} is in a staff-only area, so there's no public way in.`;
  if (!route || !legs) return 'No walking route found between those two places.';

  // Biking only covers the way to the door; inside is always walking pace.
  const times = legTimes(legs, mode);
  const distance = formatDistance(route.totalDistanceMeters, unit);
  const verb = mode === 'biking' ? 'bike' : 'walk';
  if (!legs.indoor) return `${formatDuration(times.outdoorMinutes)} ${verb} · ${distance}`;
  const inside = `${formatDuration(times.indoorMinutes)} inside`;
  return mode === 'biking'
    ? `${formatDuration(times.totalMinutes)} (${formatDuration(times.outdoorMinutes)} bike + ${inside}) · ${distance}`
    : `${formatDuration(times.totalMinutes)} walk (${inside}) · ${distance}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Under the chips, pointing at the start chip.
  tip: { position: 'absolute', left: OVERLAY_EDGE, right: OVERLAY_EDGE },
  topRow: {
    position: 'absolute',
    left: OVERLAY_EDGE,
    right: OVERLAY_EDGE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  backChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  backText: { fontSize: 22, lineHeight: 28 },
  modeToggle: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  modeOption: { paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.one + 2, borderRadius: 999 },
  centered: { textAlign: 'center' },
  crowdRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  crowdNote: { flex: 1 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  insideButton: {
    alignSelf: 'center',
    marginTop: Spacing.two,
    backgroundColor: ROUTE_COLORS.line,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  insideButtonText: { color: '#fff', textAlign: 'center' },
  insideNow: { alignSelf: 'stretch', backgroundColor: ROUTE_COLORS.start, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
