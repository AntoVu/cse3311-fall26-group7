import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloorPicker } from '@/components/map/floor-picker';
import { IndoorMapView } from '@/components/map/indoor-map-view';
import { MapDrawer, OVERLAY_EDGE, OverlayChip } from '@/components/map/map-overlays';
import { DirectionList } from '@/components/routing/route-directions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { buildingLabel } from '@/data/buildings';
import { INDOOR_FLOOR_PLANS, INDOOR_NODES } from '@/data/campus-indoor';
import { usePlaceRoute, type RouteTarget } from '@/hooks/use-place-route';
import { campusGraph } from '@/routing/campus-graph';
import { routeDirections, type DirectionStep } from '@/routing/directions';
import { etaMinutes } from '@/routing/eta';
import { buildingFloors, floorLabel, routeOnFloor, unmappedFloorOf } from '@/routing/floors';
import { formatDistance, formatDuration } from '@/routing/format';
import { useDistanceUnit } from '@/state/distance-unit';
import { entranceSide } from '@/routing/legs';

type IndoorRouteScreenProps = {
  /** Where to; null when the class or place it came from no longer exists. */
  target: RouteTarget | null;
  /** Where Back goes when there is nothing to pop (a deep link). */
  backHref: Href;
};

/**
 * The indoor leg of a walk: from the door (or a room, when the walk starts inside) to the room,
 * one floor at a time, always walking. Shared like RouteScreen. No GPS here: indoors it cannot
 * tell which floor you are on, so the floor is whatever is picked, or the step tapped. Laid out
 * like the outdoor screen: the building fills the screen, chips on top, the steps in a drawer.
 */
export function IndoorRouteScreen({ target, backHref }: IndoorRouteScreenProps) {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { start, destination, room, legs } = usePlaceRoute(target);
  const [chosenFloor, setChosenFloor] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const unit = useDistanceUnit();
  const indoor = legs?.indoor;
  // Back within this tab's stack; opened from elsewhere (or a deep link), to backHref.
  const goBack = () => (router.canDismiss() ? router.dismiss() : router.replace(backHref));

  const backChip = (
    <OverlayChip onPress={goBack} accessibilityLabel="Back" style={styles.backChip}>
      <ThemedText type="smallBold" style={styles.backText}>
        ‹
      </ThemedText>
    </OverlayChip>
  );

  if (!target || !destination || !room || !indoor) {
    const wantedRoom = target?.room ?? '';
    const unmappedFloor = target && unmappedFloorOf(INDOOR_FLOOR_PLANS[target.buildingId], wantedRoom);
    return (
      <ThemedView style={[styles.container, { paddingTop: top + OVERLAY_EDGE }]}>
        <View style={styles.missing}>
          {backChip}
          <ThemedText type="small">
            {!target || !destination
              ? 'That place is not on the map.'
              : !room
                ? unmappedFloor
                  ? `${floorLabel(unmappedFloor)} isn't mapped yet, so Room ${wantedRoom} can't be shown.`
                  : `Room ${wantedRoom} is not on the indoor map yet.`
                : 'Pick a starting point on the route screen first.'}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Floors with hallways, plus floors listed with nothing traced (one marked not mapped).
  const plans = INDOOR_FLOOR_PLANS[destination.id] ?? {};
  const levels = buildingFloors(INDOOR_NODES, plans, destination.id);
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
      <IndoorMapView
        building={destination}
        level={floor}
        route={{
          path: indoor.path,
          onFloor: routeOnFloor(indoor.path, indoor.pathNodes, destination.id, floor),
          startLevel: startFloor,
          endLevel: room.level,
        }}
        highlightRooms={{ destination: room.room, start: startRoom }}
      />

      <View pointerEvents="box-none" style={[styles.topRow, { top: top + OVERLAY_EDGE }]}>
        {backChip}
        <OverlayChip>
          <ThemedText type="smallBold" numberOfLines={1}>
            {buildingLabel(destination.id)} {room.room} · {floorLabel(floor)}
          </ThemedText>
        </OverlayChip>
      </View>
      {plans[floor]?.unmapped ? (
        <View pointerEvents="none" style={[styles.noticeRow, { top: top + OVERLAY_EDGE + 48 }]}>
          <OverlayChip>
            <ThemedText type="small">{floorLabel(floor)} isn&apos;t mapped yet.</ThemedText>
          </OverlayChip>
        </View>
      ) : null}
      <FloorPicker
        levels={levels}
        selected={floor}
        onSelect={setChosenFloor}
        style={{ top: top + OVERLAY_EDGE, right: OVERLAY_EDGE }}
      />

      <MapDrawer
        open={isDrawerOpen}
        onToggle={() => setIsDrawerOpen((open) => !open)}
        label="indoor directions"
        header={
          <>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.centered}>
              {destination.name} {room.room}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.centered}>
              {side ? `From the ${side} entrance` : `From ${start?.label ?? 'inside the building'}`} ·{' '}
              {formatDuration(etaMinutes(indoor.meters))} walk · {formatDistance(indoor.meters, unit)}
            </ThemedText>
          </>
        }>
        <DirectionList steps={steps} onPressStep={(step) => step.level && setChosenFloor(step.level)} />
      </MapDrawer>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { paddingHorizontal: OVERLAY_EDGE, gap: Spacing.three, alignItems: 'flex-start' },
  // Leaves room on the right for the floor picker.
  topRow: {
    position: 'absolute',
    left: OVERLAY_EDGE,
    right: OVERLAY_EDGE + 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  // Under the top row, clear of the floor picker.
  noticeRow: { position: 'absolute', left: OVERLAY_EDGE, right: OVERLAY_EDGE + 48, flexDirection: 'row' },
  backChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  backText: { fontSize: 22, lineHeight: 28 },
  centered: { textAlign: 'center' },
});
