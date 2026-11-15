import { INDOOR_BUILDINGS } from '@/data/campus-indoor';
import { getCampusGraph, indoorBuilding, loadIndoor } from '@/routing/campus-graph';
import type { MapEdge } from '@/types/map';

/** Every building's indoor data loaded at once, for tests that check the whole campus. */
export async function loadAllIndoor() {
  const ids = Object.keys(INDOOR_BUILDINGS);
  // Jest runs no import() without --experimental-vm-modules: load the same files with require.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  for (const id of ids) INDOOR_BUILDINGS[id].load = async () => require(`@/data/indoor/${id}`);
  await Promise.all(ids.map(loadIndoor));
  const buildings = ids.map((id) => [id, indoorBuilding(id)!] as const);
  // A door into another building is in both files.
  const edges = new Map<string, MapEdge>();
  for (const [, b] of buildings) for (const edge of b.edges) edges.set(edge.id, edge);
  return {
    graph: getCampusGraph(),
    nodes: buildings.flatMap(([, b]) => b.nodes),
    edges: [...edges.values()],
    plans: Object.fromEntries(buildings.map(([id, b]) => [id, b.plans])),
  };
}
