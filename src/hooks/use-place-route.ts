import { findBuilding } from '@/data/buildings';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { campusGraph } from '@/routing/campus-graph';
import { splitRoute } from '@/routing/legs';
import { findRoomNode } from '@/routing/rooms';
import { findRoute } from '@/routing/route';
import { resolveStartPoint, type StartPoint } from '@/routing/start-point';
import { useStartPoint } from '@/state/start-point';
import { useUserLocation } from '@/state/user-location';

/** Where a route goes: a building, and a room in it when there is one. */
export type RouteTarget = { buildingId: string; room?: string };

/**
 * The app's one way to work out a walk: from the start point (or `from`, e.g. a parking lot) to
 * the target room's door, or to the building when the room isn't traced, split where it walks into
 * the building (splitRoute). The Map, Schedule and Parking tabs all route through here, so every
 * screen shows the same walk. Screens should not call findRoute themselves.
 */
export function usePlaceRoute(target: RouteTarget | null | undefined, from?: StartPoint) {
  const storedStart = useStartPoint();
  const startPoint = from ?? storedStart;
  const userLocation = useUserLocation();

  const destination = target ? findBuilding(target.buildingId) : undefined;
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
  // useMemo: it refuses to optimize code whose hand-written memo it cannot verify, and then
  // loses memoization for the whole component -- which costs more than it saves here.
  const room = target?.room ? findRoomNode(campusGraph, target.buildingId, target.room) : null;
  const route =
    start && destination
      ? findRoute(campusGraph, start.coordinate, room ? room.coordinate : destination.coordinate, {
          toNodeId: room?.id,
          toPoiId: room ? undefined : destination.id,
          fromNodeId: start.nodeId,
          fromPoiId,
        })
      : null;
  const legs = route && destination ? splitRoute(route, campusGraph, destination.id) : null;

  return { startPoint, start, destination, room, route, legs };
}
