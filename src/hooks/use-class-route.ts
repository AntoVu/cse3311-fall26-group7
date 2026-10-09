import { useSchedule } from '@/context/schedule-context';
import { findBuilding } from '@/data/buildings';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { campusGraph } from '@/routing/campus-graph';
import { splitRoute } from '@/routing/legs';
import { findRoomNode } from '@/routing/rooms';
import { findRoute } from '@/routing/route';
import { resolveStartPoint } from '@/routing/start-point';
import { useStartPoint } from '@/state/start-point';
import { useUserLocation } from '@/state/user-location';

/**
 * The walk to a class, shared by its outdoor and indoor screens so both show the same route:
 * one search from the start point to the room's door (or to the building when the room isn't
 * traced), split where it walks into the building (splitRoute).
 */
export function useClassRoute(classId: string | undefined) {
  const { classes } = useSchedule();
  const scheduleClass = classes.find((candidate) => candidate.id === classId);
  const startPoint = useStartPoint();
  const userLocation = useUserLocation();

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
  // useMemo: it refuses to optimize code whose hand-written memo it cannot verify, and then
  // loses memoization for the whole component -- which costs more than it saves here.
  const room = scheduleClass
    ? findRoomNode(campusGraph, scheduleClass.buildingId, scheduleClass.roomNumber)
    : null;
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

  return { scheduleClass, startPoint, start, destination, room, route, legs };
}
