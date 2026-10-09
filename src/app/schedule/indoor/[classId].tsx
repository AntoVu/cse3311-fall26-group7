import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloorPicker } from '@/components/map/floor-picker';
import { IndoorMapView } from '@/components/map/indoor-map-view';
import { RouteDirections } from '@/components/routing/route-directions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { INDOOR_NODES } from '@/data/campus-indoor';
import { useClassRoute } from '@/hooks/use-class-route';
import { campusGraph } from '@/routing/campus-graph';
import { routeDirections, type DirectionStep } from '@/routing/directions';
import { etaMinutes } from '@/routing/eta';
import { buildingLevels, routeOnFloor } from '@/routing/floors';
import { formatDistance, formatDuration } from '@/routing/format';
import { entranceSide } from '@/routing/legs';

/**
 * The indoor leg of the walk to a class: from the door (or a room, when the walk starts inside)
 * to the classroom, one floor at a time, always walking. No GPS here: indoors it cannot tell
 * which floor you are on, so the floor is whatever is picked, or the step tapped.
 */
export default function IndoorRouteScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { scheduleClass, start, destination, room, legs } = useClassRoute(classId);
  const [chosenFloor, setChosenFloor] = useState<string | null>(null);
  const indoor = legs?.indoor;

  if (!scheduleClass || !destination || !room || !indoor) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: true, title: 'Inside' }} />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ThemedText type="small" style={styles.header}>
            {!scheduleClass
              ? 'Class not found.'
              : !room
                ? `Room ${scheduleClass.roomNumber} is not on the indoor map yet.`
                : 'Pick a starting point on the route screen first.'}
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const levels = buildingLevels(INDOOR_NODES, destination.id);
  const startFloor = indoor.pathNodes.find((node) => node?.level)?.level ?? levels[0];
  const floor = chosenFloor && levels.includes(chosenFloor) ? chosenFloor : startFloor;
  const side = legs.entrance ? entranceSide(legs.entrance.coordinate, destination.coordinate) : null;
  const startRoom = start?.nodeId ? campusGraph.nodeById.get(start.nodeId)?.room : undefined;

  const steps: DirectionStep[] = [
    ...(side ? [{ text: `Enter at the ${side} entrance`, distanceMeters: 0, level: startFloor }] : []),
    ...routeDirections(indoor.path, {
      pathNodes: indoor.pathNodes,
      destinationName: `${destination.name} ${room.room}`,
    }),
  ];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: `${destination.name} ${room.room}` }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">
            {destination.name} {room.room}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {side ? `From the ${side} entrance` : `From ${start?.label ?? 'inside the building'}`}
          </ThemedText>
          <ThemedText type="small">
            {formatDistance(indoor.meters)} · {formatDuration(etaMinutes(indoor.meters))} walk
          </ThemedText>
          <RouteDirections
            steps={steps}
            initiallyOpen
            onPressStep={(step) => step.level && setChosenFloor(step.level)}
          />
        </View>

        <View style={styles.mapArea}>
          <IndoorMapView
            building={destination}
            level={floor}
            route={{
              path: indoor.path,
              onFloor: routeOnFloor(indoor.path, indoor.pathNodes, destination.id, floor),
              startLevel: startFloor,
              endLevel: room.level,
            }}
            highlightRooms={[room.room!, ...(startRoom ? [startRoom] : [])]}
          />
          <FloorPicker levels={levels} selected={floor} onSelect={setChosenFloor} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  mapArea: { flex: 1 },
  header: { padding: Spacing.three, gap: Spacing.two },
});
