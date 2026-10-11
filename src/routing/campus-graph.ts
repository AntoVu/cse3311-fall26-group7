import { INDOOR_EDGES, INDOOR_NODES } from '@/data/campus-indoor';
import { WALKWAY_EDGES, WALKWAY_NODES } from '@/data/campus-walkways';
import { buildGraph } from '@/routing/graph';

/**
 * The campus graph, outdoor walkways plus indoor hallways, built once when this module is
 * first imported. The two meet at building entrances; `snapToGraph` never starts a route on an
 * indoor node.
 *
 * The underlying data is generated and never changes at runtime, so there is nothing to
 * rebuild and no reason to make every screen do it again. Tests that want a small graph of
 * their own call `buildGraph` directly instead of importing this.
 */
export const campusGraph = buildGraph([...WALKWAY_NODES, ...INDOOR_NODES], [...WALKWAY_EDGES, ...INDOOR_EDGES]);
