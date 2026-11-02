import { useEffect } from 'react';

import { INDOOR_BUILDINGS } from '@/data/campus-indoor';
import { WALKWAY_EDGES, WALKWAY_NODES } from '@/data/campus-walkways';
import { buildGraph, type WalkGraph } from '@/routing/graph';
import { createStore, useStore } from '@/state/create-store';
import type { IndoorBuildingData, MapEdge } from '@/types/map';

/**
 * The campus graph: outdoor walkways from the start, plus the hallways of each building loaded so
 * far. Indoor data is one file per building (src/data/indoor/), fetched the first time a screen
 * needs it, so opening the app downloads only the outdoor map. Loading one rebuilds the graph (a
 * few ms) and re-renders every screen reading it.
 *
 * Routes to a building's door need no indoor data: entrances are walkway nodes (`entranceOf`). A
 * consequence: an outdoor route only cuts through a building that happens to be loaded.
 *
 * Tests that want a small graph of their own call `buildGraph` directly instead of importing this.
 */
type IndoorState = { graph: WalkGraph; buildings: ReadonlyMap<string, IndoorBuildingData> };

const indoorStore = createStore<IndoorState>({
  graph: buildGraph(WALKWAY_NODES, WALKWAY_EDGES),
  buildings: new Map(),
});
const pending = new Map<string, Promise<void>>();

/** Whether a building has an indoor map, without loading it. */
export const hasIndoorData = (poiId: string | undefined): poiId is string => !!poiId && poiId in INDOOR_BUILDINGS;

function loadOne(poiId: string): Promise<void> {
  let loading = pending.get(poiId);
  if (!loading) {
    loading = INDOOR_BUILDINGS[poiId].load().then(({ default: data }) => {
      const buildings = new Map(indoorStore.get().buildings).set(poiId, data);
      // A door into another building is in both files: one edge each.
      const edges = new Map<string, MapEdge>();
      for (const b of buildings.values()) for (const edge of b.edges) edges.set(edge.id, edge);
      const nodes = [...buildings.values()].flatMap((b) => b.nodes);
      indoorStore.set({ graph: buildGraph([...WALKWAY_NODES, ...nodes], [...WALKWAY_EDGES, ...edges.values()]), buildings });
    });
    // A failed download (offline) is tried again next time.
    loading.catch(() => pending.delete(poiId));
    pending.set(poiId, loading);
  }
  return loading;
}

/** Loads a building's indoor map and those of the buildings its doors lead into. */
export function loadIndoor(poiId: string): Promise<void> {
  if (!hasIndoorData(poiId)) return Promise.resolve();
  return Promise.all([poiId, ...INDOOR_BUILDINGS[poiId].links].map(loadOne)).then(() => undefined);
}

export const getCampusGraph = () => indoorStore.get().graph;
/** A loaded building's nodes, edges and floor plans; undefined until loaded. */
export const indoorBuilding = (poiId: string) => indoorStore.get().buildings.get(poiId);

/**
 * The campus graph with these buildings' insides, loading any not in yet. `ready` is false until
 * all of them (and the buildings their doors lead into) are in; a building with no indoor map is
 * ready at once. `building(poiId)` is a loaded building's nodes, edges and floor plans.
 */
export function useCampusGraph(...poiIds: (string | undefined)[]) {
  const { graph, buildings } = useStore(indoorStore);
  const wanted = poiIds.filter(hasIndoorData);
  const key = wanted.join('|');
  useEffect(() => {
    // ponytail: a failed load leaves `ready` false (the screen keeps saying loading) until reopened.
    for (const poiId of key ? key.split('|') : []) loadIndoor(poiId).catch(() => {});
  }, [key]);
  const ready = wanted.every((poiId) => [poiId, ...INDOOR_BUILDINGS[poiId].links].every((id) => buildings.has(id)));
  return { graph, ready, building: (poiId: string | undefined) => (poiId ? buildings.get(poiId) : undefined) };
}
