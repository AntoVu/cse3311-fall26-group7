import { WALKWAY_EDGES, WALKWAY_NODES } from '@/data/campus-walkways';
import { buildGraph } from '@/routing/graph';

/**
 * The campus walkway graph, built once when this module is first imported.
 *
 * The underlying data is generated and never changes at runtime, so there is nothing to
 * rebuild and no reason to make every screen do it again. Tests that want a small graph of
 * their own call `buildGraph` directly instead of importing this.
 */
export const campusGraph = buildGraph(WALKWAY_NODES, WALKWAY_EDGES);
