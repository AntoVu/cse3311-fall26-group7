import { neighborsOf, type WalkGraph } from '@/routing/graph';

/**
 * Dijkstra's shortest path over the walkway graph -- the "path finding algorithm like
 * Dijkstra" the inception document's UC-02 calls for.
 *
 * Costs are real distances in meters, not hop counts, so a route of two long edges correctly
 * loses to one of three short ones. An edge can cost more than it measures (`costMeters`, e.g.
 * cutting through a room): the search follows cost, while the distances it reports stay the
 * meters actually walked.
 */

export type PathResult = {
  /** Every node passed through, start and destination included. */
  nodeIds: string[];
  /** The edges walked, in order. One shorter than `nodeIds`. */
  edgeIds: string[];
  totalDistanceMeters: number;
};

/**
 * A binary min-heap keyed on cost.
 *
 * Scanning an array for the nearest unvisited node instead would make the search quadratic;
 * at roughly 2,200 nodes that is millions of comparisons per route, which is too slow to
 * re-run whenever a screen re-renders.
 */
class MinHeap {
  private items: { nodeId: string; cost: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(nodeId: string, cost: number): void {
    this.items.push({ nodeId, cost });
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].cost <= this.items[index].cost) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  pop(): { nodeId: string; cost: number } | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && this.items[left].cost < this.items[smallest].cost) {
          smallest = left;
        }
        if (right < this.items.length && this.items[right].cost < this.items[smallest].cost) {
          smallest = right;
        }
        if (smallest === index) break;
        [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
        index = smallest;
      }
    }
    return top;
  }
}

const known = (graph: WalkGraph, ids: string | string[]) =>
  (Array.isArray(ids) ? ids : [ids]).filter((id) => graph.nodeById.has(id));

/**
 * Dijkstra from `sources`, stopping early at the first of `targets` when given. Returns the
 * meters walked to each node along the cheapest way found to it, and how each was reached.
 */
function search(graph: WalkGraph, sources: string[], targets?: Set<string>) {
  const cost = new Map<string, number>();
  const meters = new Map<string, number>();
  const cameFrom = new Map<string, { nodeId: string; edgeId: string }>();
  const settled = new Set<string>();
  const queue = new MinHeap();
  for (const id of sources) {
    cost.set(id, 0);
    meters.set(id, 0);
    queue.push(id, 0);
  }

  let reached: string | undefined;
  while (queue.size > 0) {
    const current = queue.pop()!;
    // The heap has no decrease-key, so a node can be queued more than once at different
    // costs. The first time it comes off the heap is its best one; ignore the rest.
    if (settled.has(current.nodeId)) continue;
    settled.add(current.nodeId);
    if (targets?.has(current.nodeId)) {
      reached = current.nodeId;
      break;
    }

    for (const step of neighborsOf(graph, current.nodeId)) {
      if (settled.has(step.toNodeId)) continue;
      const next = current.cost + step.costMeters;
      if (next >= (cost.get(step.toNodeId) ?? Infinity)) continue;
      cost.set(step.toNodeId, next);
      meters.set(step.toNodeId, meters.get(current.nodeId)! + step.distanceMeters);
      cameFrom.set(step.toNodeId, { nodeId: current.nodeId, edgeId: step.edgeId });
      queue.push(step.toNodeId, next);
    }
  }
  return { meters, cameFrom, reached };
}

/**
 * The cheapest walk between two nodes, or null when the graph offers no way through. Either end
 * can be several nodes (a building's doors): the walk then leaves from, or stops at, whichever
 * is nearest.
 */
export function shortestPath(
  graph: WalkGraph,
  from: string | string[],
  to: string | string[]
): PathResult | null {
  const sources = known(graph, from);
  const targets = new Set(known(graph, to));
  if (sources.length === 0 || targets.size === 0) return null;

  const { meters, cameFrom, reached } = search(graph, sources, targets);
  if (!reached) return null;

  const nodeIds = [reached];
  const edgeIds: string[] = [];
  let cursor = reached;
  // Sources have no cameFrom entry, so the walk back stops at whichever one the path left from.
  for (let previous = cameFrom.get(cursor); previous; previous = cameFrom.get(cursor)) {
    nodeIds.push(previous.nodeId);
    edgeIds.push(previous.edgeId);
    cursor = previous.nodeId;
  }
  nodeIds.reverse();
  edgeIds.reverse();

  return { nodeIds, edgeIds, totalDistanceMeters: meters.get(reached)! };
}

/**
 * Walking distance from one node (or the nearest of several) to every node it can reach, along
 * each one's cheapest way.
 *
 * Same search as `shortestPath` without an early exit. Ranking parking lots by how far they
 * are from a class needs one of these from the class, rather than one full search per lot --
 * a single pass answers for all of them at once.
 */
export function shortestPathTree(graph: WalkGraph, from: string | string[]): Map<string, number> {
  return search(graph, known(graph, from)).meters;
}
