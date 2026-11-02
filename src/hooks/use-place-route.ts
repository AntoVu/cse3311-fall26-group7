import { CROWD_ZONES } from '@/constants/foot-traffic';
import { useSchedule } from '@/context/schedule-context';
import { findBuilding } from '@/data/buildings';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useCampusGraph } from '@/routing/campus-graph';
import { activeCrowdZones, crowdCost, crowdedEdgeIds, zonesOnRoute } from '@/routing/foot-traffic';
import { splitRoute } from '@/routing/legs';
import { findRoomNode } from '@/routing/rooms';
import { findRoute } from '@/routing/route';
import { resolveStartPoint, type StartPoint } from '@/routing/start-point';
import { useAvoidCrowds } from '@/state/avoid-crowds';
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
  const avoidCrowds = useAvoidCrowds();
  const { currentTime } = useSchedule();
  // The destination's inside (best entrance, the room's door) and a room start's building.
  const { graph: campusGraph, ready, building } = useCampusGraph(
    target?.buildingId,
    startPoint?.kind === 'room' ? startPoint.poiId : undefined
  );

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
  // Busy now (the app's clock, so the Developer clock moves it too); avoided only when switched on.
  const busy = activeCrowdZones(CROWD_ZONES, currentTime);
  const edgeCost =
    avoidCrowds && busy.length > 0 ? crowdCost(crowdedEdgeIds(campusGraph, busy)) : undefined;
  // `cost` null: the direct walk (undefined would fall back to the default).
  const routeTo = (allowRestricted: boolean, cost: typeof edgeCost | null = edgeCost) =>
    start && destination
      ? findRoute(campusGraph, start.coordinate, room ? room.coordinate : destination.coordinate, {
          toNodeId: room?.id,
          toPoiId: room ? undefined : destination.id,
          fromNodeId: start.nodeId,
          fromPoiId,
          allowRestricted,
          edgeCost: cost ?? undefined,
        })
      : null;
  // Until the building's inside is in, a route would only reach its door: wait for it instead.
  const route = ready ? routeTo(false) : null;
  // The walk without avoiding, to say what avoiding skipped and what it cost (UC-04).
  const direct = edgeCost && ready ? routeTo(false, null) : route;
  const crowds = {
    busy,
    /** Busy zones this route still walks through. */
    through: route ? zonesOnRoute(route.edgeIds, busy, campusGraph) : [],
    /** Busy zones the direct walk crosses and this one goes around. */
    avoided:
      edgeCost && route && direct
        ? zonesOnRoute(direct.edgeIds, busy, campusGraph).filter(
            (zone) => !zonesOnRoute(route.edgeIds, [zone], campusGraph).length
          )
        : [],
    extraMeters: route && direct ? route.totalDistanceMeters - direct.totalDistanceMeters : 0,
  };
  const legs = route && destination ? splitRoute(route, campusGraph, destination.id) : null;
  // No public way in, but a staff-only hallway reaches it. ponytail: a second search, only on failure.
  const staffOnly = ready && !route && !!room && !!routeTo(true);

  return { startPoint, start, destination, room, route, legs, staffOnly, crowds, loading: !ready, graph: campusGraph, building };
}
