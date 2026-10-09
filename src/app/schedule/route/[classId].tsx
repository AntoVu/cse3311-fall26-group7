import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { FloorPicker } from '@/components/map/floor-picker';
import { RouteDirections } from '@/components/routing/route-directions';
import { StartPointSheet } from '@/components/routing/start-point-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { confirmAction } from '@/components/ui/alert';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';
import { buildingName, findBuilding } from '@/data/buildings';
import { INDOOR_NODES } from '@/data/campus-indoor';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { campusGraph } from '@/routing/campus-graph';
import { routeDirections } from '@/routing/directions';
import { buildingLevels, routeOnFloor } from '@/routing/floors';
import type { TravelMode } from '@/routing/eta';
import { formatDistance, formatDuration } from '@/routing/format';
import { findRoomNode, hasIndoorMap } from '@/routing/rooms';
import { findRoute } from '@/routing/route';
import { resolveStartPoint } from '@/routing/start-point';
import { useStartPoint } from '@/state/start-point';
import { useUserLocation } from '@/state/user-location';

export default function RoutePreviewScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { classes, removeClass } = useSchedule();
  const scheduleClass = classes.find((candidate) => candidate.id === classId);

  const startPoint = useStartPoint();
  const userLocation = useUserLocation();
  const [isStartSheetVisible, setIsStartSheetVisible] = useState(false);
  const [chosenFloor, setChosenFloor] = useState<string | null>(null);
  const [mode, setMode] = useState<TravelMode>('walking');

  const destination = scheduleClass ? findBuilding(scheduleClass.buildingId) : undefined;

  const start = startPoint
    ? resolveStartPoint(startPoint, {
        pois: CAMPUS_POIS,
        lots: CAMPUS_LOTS,
        userLocation: userLocation?.coordinate ?? null,
        findRoom: (poiId, roomNumber) => findRoomNode(campusGraph, poiId, roomNumber),
      })
    : null;
  // Leaving from a building starts at its nearest door.
  const fromPoiId = startPoint?.kind === 'building' ? startPoint.poiId : undefined;

  // Dijkstra over ~2,200 nodes. Left to the React Compiler to memoize rather than a manual
  // useMemo: it refuses to optimize a component whose hand-written memo it cannot verify, and
  // the whole component then loses memoization -- which costs more than it saves here.
  // Straight to the room's door when the building is traced indoors; to the building otherwise.
  const room = scheduleClass
    ? findRoomNode(campusGraph, scheduleClass.buildingId, scheduleClass.roomNumber)
    : null;
  const route =
    start && destination
      ? room
        ? findRoute(campusGraph, start.coordinate, room.coordinate, {
            toNodeId: room.id,
            fromNodeId: start.nodeId,
            fromPoiId,
            mode,
          })
        : findRoute(campusGraph, start.coordinate, destination.coordinate, {
            toPoiId: destination.id,
            fromNodeId: start.nodeId,
            fromPoiId,
            mode,
          })
      : null;

  // The class's building, one floor at a time, when it is traced indoors. Opens on the room's floor.
  const levels = scheduleClass ? buildingLevels(INDOOR_NODES, scheduleClass.buildingId) : [];
  const floor =
    chosenFloor && levels.includes(chosenFloor) ? chosenFloor : (room?.level ?? levels[0]);
  const indoor =
    scheduleClass && floor
      ? {
          poiId: scheduleClass.buildingId,
          level: floor,
          routeOnFloor: route
            ? routeOnFloor(route.path, route.pathNodes, scheduleClass.buildingId, floor)
            : undefined,
        }
      : undefined;

  const handleRemoveClass = async () => {
    if (!scheduleClass) return;
    const confirmed = await confirmAction(
      'Remove Class',
      `Are you sure you want to remove ${scheduleClass.courseCode} from your schedule?`,
      'Remove'
    );
    if (confirmed) {
      removeClass(scheduleClass.id);
      router.back();
    }
  };

  if (!scheduleClass) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: true, title: 'Route' }} />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ThemedText type="small">Class not found.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: scheduleClass.courseCode,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${scheduleClass.courseCode}`}
              onPress={handleRemoveClass}
              hitSlop={8}
              style={({ pressed }) => [styles.headerRemoveButton, pressed && styles.pressed]}>
              <ThemedText style={styles.headerRemoveText}>Remove</ThemedText>
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">
            {scheduleClass.courseCode}: {scheduleClass.courseName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {buildingName(scheduleClass.buildingId)} {scheduleClass.roomNumber} ·{' '}
            {scheduleClass.startTime} - {scheduleClass.endTime}
          </ThemedText>

          <View style={styles.pillRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                start ? `Starting from ${start.label}. Tap to change it.` : 'Choose a starting point'
              }
              onPress={() => setIsStartSheetVisible(true)}
              style={[styles.startPill, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {start ? `Start: ${start.label}` : 'Choose a starting point'}
              </ThemedText>
            </Pressable>
            <View
              accessibilityRole="radiogroup"
              style={[styles.modeToggle, { backgroundColor: theme.backgroundElement }]}>
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
          </View>

          <ThemedText type="small">
            {summaryFor({ startPoint, start, destination, route, mode })}
          </ThemedText>
          {route && !room && hasIndoorMap(campusGraph, scheduleClass.buildingId) ? (
            <ThemedText type="small" themeColor="textSecondary">
              Room {scheduleClass.roomNumber} is not on the indoor map yet, so this ends at the building.
            </ThemedText>
          ) : null}
          {route ? (
            <RouteDirections
              steps={routeDirections(route.path, {
                pathNodes: route.pathNodes,
                destinationName: room
                  ? `${buildingName(scheduleClass.buildingId)} ${scheduleClass.roomNumber}`
                  : destination?.name,
                buildingName: (poiId) => findBuilding(poiId)?.name,
              })}
            />
          ) : null}
        </View>

        <View style={styles.mapArea}>
          <CampusMapView pois={CAMPUS_POIS} mutedBuildings route={route?.path} indoor={indoor} />
          {floor ? <FloorPicker levels={levels} selected={floor} onSelect={setChosenFloor} /> : null}
        </View>
      </SafeAreaView>

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
  mode,
}: {
  startPoint: unknown;
  start: { label: string } | null;
  destination: unknown;
  route: { totalDistanceMeters: number; etaMinutes: number } | null;
  mode: TravelMode;
}): string {
  if (!destination) return 'This class is in a building that is not on the map.';
  if (!startPoint) return 'Pick a starting point to see the walk to this class.';
  if (!start) return 'That starting point is unavailable right now. Pick another.';
  if (!route) return 'No walking route found between those two places.';
  // ponytail: biking rides the same footpaths at bike speed the whole way, building included.
  // Split the ETA at the entrance (pathNodes) if bike-then-walk times start to matter.
  const verb = mode === 'biking' ? 'bike' : 'walk';
  return `${formatDistance(route.totalDistanceMeters)} · ${formatDuration(route.etaMinutes)} ${verb}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  mapArea: { flex: 1 },
  header: { padding: Spacing.three, gap: Spacing.two },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  modeToggle: { flexDirection: 'row', borderRadius: 20, padding: 3 },
  modeOption: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2, borderRadius: 17 },
  startPill: {
    flexShrink: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  headerRemoveButton: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  headerRemoveText: { color: '#e53935', fontWeight: '600', fontSize: 16 },
  pressed: { opacity: 0.6 },
});
