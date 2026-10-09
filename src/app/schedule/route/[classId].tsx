import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { overlaySurface } from '@/components/map/map-legend';
import { MapDrawer, OVERLAY_EDGE, OverlayChip } from '@/components/map/map-overlays';
import { DirectionList } from '@/components/routing/route-directions';
import { StartPointSheet } from '@/components/routing/start-point-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ROUTE_COLORS } from '@/constants/routing';
import { Spacing } from '@/constants/theme';
import { buildingLabel, findBuilding } from '@/data/buildings';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useClassRoute } from '@/hooks/use-class-route';
import { useTheme } from '@/hooks/use-theme';
import { campusGraph } from '@/routing/campus-graph';
import { routeDirections } from '@/routing/directions';
import type { TravelMode } from '@/routing/eta';
import { formatDistance, formatDuration } from '@/routing/format';
import { entranceSide, legTimes, type RouteLegs } from '@/routing/legs';
import { hasIndoorMap } from '@/routing/rooms';

/**
 * The outdoor leg of the walk to a class: from the start point to the building's door, walking
 * or biking. Laid out like the Map and Parking tabs: the map fills the screen, status bar
 * included, with chips along the top and a drawer at the bottom. Inside the building is the
 * indoor screen ("Go inside"). Classes are removed from the Schedule list's Edit mode.
 */
export default function RoutePreviewScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { scheduleClass, startPoint, start, destination, room, route, legs } = useClassRoute(classId);
  const [isStartSheetVisible, setIsStartSheetVisible] = useState(false);
  const [mode, setMode] = useState<TravelMode>('walking');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Starting inside the building leaves nothing to walk outdoors: go straight to the inside.
  // Only while this screen is showing: the start point can change from another tab.
  const isFocused = useIsFocused();
  const startsInside = !!legs && !legs.outdoor && !!legs.indoor;
  useEffect(() => {
    if (isFocused && startsInside && classId) {
      router.replace({ pathname: '/schedule/indoor/[classId]', params: { classId } });
    }
  }, [isFocused, startsInside, classId, router]);

  // Back within the Schedule tab's stack; opened from elsewhere (or a deep link), to the list.
  const goBack = () => (router.canDismiss() ? router.dismiss() : router.replace('/schedule'));
  const entranceName =
    destination && legs?.entrance
      ? `${destination.name} (${entranceSide(legs.entrance.coordinate, destination.coordinate)} entrance)`
      : destination?.name;
  const missingRoom =
    !!scheduleClass && !!route && !room && hasIndoorMap(campusGraph, scheduleClass.buildingId);

  return (
    <ThemedView style={styles.container}>
      <CampusMapView pois={CAMPUS_POIS} mutedBuildings route={legs?.outdoor?.path} />

      <View pointerEvents="box-none" style={[styles.topRow, { top: top + OVERLAY_EDGE }]}>
        <OverlayChip onPress={goBack} accessibilityLabel="Back" style={styles.backChip}>
          <ThemedText type="smallBold" style={styles.backText}>
            ‹
          </ThemedText>
        </OverlayChip>
        {scheduleClass ? (
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
        {scheduleClass ? (
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
              {scheduleClass
                ? `${scheduleClass.courseCode} · ${buildingLabel(scheduleClass.buildingId)} ${scheduleClass.roomNumber} · ${scheduleClass.startTime}`
                : 'Class not found'}
            </ThemedText>
            {scheduleClass ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={isDrawerOpen ? undefined : 1}
                style={styles.centered}>
                {summaryFor({ startPoint, start, destination, route, legs, mode })}
              </ThemedText>
            ) : null}
          </>
        }
        footer={
          scheduleClass && legs?.indoor ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/schedule/indoor/[classId]', params: { classId: scheduleClass.id } })
              }
              style={({ pressed }) => [styles.insideButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.insideButtonText}>
                Go inside ▸ Room {scheduleClass.roomNumber}
              </ThemedText>
            </Pressable>
          ) : null
        }>
        {missingRoom ? (
          <ThemedText type="small" themeColor="textSecondary">
            Room {scheduleClass.roomNumber} is not on the indoor map yet, so this ends at the building.
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
}: {
  startPoint: unknown;
  start: { label: string } | null;
  destination: unknown;
  route: { totalDistanceMeters: number } | null;
  legs: RouteLegs | null;
  mode: TravelMode;
}): string {
  if (!destination) return 'This class is in a building that is not on the map.';
  if (!startPoint) return 'Pick a starting point to see the walk to this class.';
  if (!start) return 'That starting point is unavailable right now. Pick another.';
  if (!route || !legs) return 'No walking route found between those two places.';

  // Biking only covers the way to the door; inside is always walking pace.
  const times = legTimes(legs, mode);
  const distance = formatDistance(route.totalDistanceMeters);
  const verb = mode === 'biking' ? 'bike' : 'walk';
  if (!legs.indoor) return `${formatDuration(times.outdoorMinutes)} ${verb} · ${distance}`;
  const inside = `${formatDuration(times.indoorMinutes)} inside`;
  return mode === 'biking'
    ? `${formatDuration(times.totalMinutes)} (${formatDuration(times.outdoorMinutes)} bike + ${inside}) · ${distance}`
    : `${formatDuration(times.totalMinutes)} walk (${inside}) · ${distance}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  insideButton: {
    alignSelf: 'center',
    marginTop: Spacing.two,
    backgroundColor: ROUTE_COLORS.line,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  insideButtonText: { color: '#fff' },
  pressed: { opacity: 0.6 },
});
