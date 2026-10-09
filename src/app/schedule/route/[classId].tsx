import { Stack, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { RouteDirections } from '@/components/routing/route-directions';
import { StartPointSheet } from '@/components/routing/start-point-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { confirmAction } from '@/components/ui/alert';
import { ROUTE_COLORS } from '@/constants/routing';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';
import { buildingName, findBuilding } from '@/data/buildings';
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
 * The outdoor leg of the walk to a class: from the start point to the building's door, on the
 * campus map, walking or biking. Inside the building is the indoor screen ("Go inside").
 */
export default function RoutePreviewScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { removeClass } = useSchedule();
  const { scheduleClass, startPoint, start, destination, room, route, legs } = useClassRoute(classId);
  const [isStartSheetVisible, setIsStartSheetVisible] = useState(false);
  const [mode, setMode] = useState<TravelMode>('walking');

  // Starting inside the building leaves nothing to walk outdoors: go straight to the inside.
  // Only while this screen is showing: the start point can change from another tab.
  const isFocused = useIsFocused();
  const startsInside = !!legs && !legs.outdoor && !!legs.indoor;
  useEffect(() => {
    if (isFocused && startsInside && classId) {
      router.replace({ pathname: '/schedule/indoor/[classId]', params: { classId } });
    }
  }, [isFocused, startsInside, classId, router]);

  const entranceName =
    destination && legs?.entrance
      ? `${destination.name} (${entranceSide(legs.entrance.coordinate, destination.coordinate)} entrance)`
      : destination?.name;

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
            {summaryFor({ startPoint, start, destination, route, legs, mode })}
          </ThemedText>
          {route && !room && hasIndoorMap(campusGraph, scheduleClass.buildingId) ? (
            <ThemedText type="small" themeColor="textSecondary">
              Room {scheduleClass.roomNumber} is not on the indoor map yet, so this ends at the building.
            </ThemedText>
          ) : null}
          {legs?.outdoor ? (
            <RouteDirections
              steps={routeDirections(legs.outdoor.path, {
                pathNodes: legs.outdoor.pathNodes,
                destinationName: entranceName,
                buildingName: (poiId) => findBuilding(poiId)?.name,
              })}
            />
          ) : null}
          {legs?.indoor ? (
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
          ) : null}
        </View>

        <View style={styles.mapArea}>
          <CampusMapView pois={CAMPUS_POIS} mutedBuildings route={legs?.outdoor?.path} />
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
  if (!legs.indoor) return `${distance} · ${formatDuration(times.outdoorMinutes)} ${verb}`;
  const inside = `${formatDuration(times.indoorMinutes)} inside`;
  return mode === 'biking'
    ? `${distance} · ${formatDuration(times.totalMinutes)} (${formatDuration(times.outdoorMinutes)} bike + ${inside})`
    : `${distance} · ${formatDuration(times.totalMinutes)} walk (${inside})`;
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
  insideButton: {
    alignSelf: 'flex-start',
    backgroundColor: ROUTE_COLORS.line,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  insideButtonText: { color: '#fff' },
  headerRemoveButton: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  headerRemoveText: { color: '#e53935', fontWeight: '600', fontSize: 16 },
  pressed: { opacity: 0.6 },
});
