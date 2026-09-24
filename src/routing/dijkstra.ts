import { neighborsOf, type WalkGraph } from '@/routing/graph';

/**
 * Dijkstra's shortest path over the walkway graph -- the "path finding algorithm like
 * Dijkstra" the inception document's UC-02 calls for.
 *
 * Costs are real distances in meters, not hop counts, so a route of two long edges correctly
 * loses to one of three short ones.
 */

export type PathResult = {
  /** Every node passed through, start and destination included. */
  nodeIds: string[];
  /** The edges walked, in order. One shorter than `nodeIds`. */
  edgeIds: string[];
  totalDistanceMeters: number;
};

/**
 * A binary min-heap keyed on distance.
 *
 * Scanning an array for the nearest unvisited node instead would make the search quadratic;
 * at roughly 2,200 nodes that is millions of comparisons per route, which is too slow to
 * re-run whenever a screen re-renders.
 */
class MinHeap {
  private items: { nodeId: string; distance: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(nodeId: string, distance: number): void {
    this.items.push({ nodeId, distance });
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].distance <= this.items[index].distance) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  pop(): { nodeId: string; distance: number } | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && this.items[left].distance < this.items[smallest].distance) {
          smallest = left;
        }
        if (right < this.items.length && this.items[right].distance < this.items[smallest].distance) {
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

/** The cheapest walk between two nodes, or null when the graph offers no way through. */
export function shortestPath(
  graph: WalkGraph,
  fromNodeId: string,
  toNodeId: string
): PathResult | null {
  if (!graph.nodeById.has(fromNodeId) || !graph.nodeById.has(toNodeId)) return null;
  if (fromNodeId === toNodeId) {
    return { nodeIds: [fromNodeId], edgeIds: [], totalDistanceMeters: 0 };
  }

  const best = new Map<string, number>([[fromNodeId, 0]]);
  const cameFrom = new Map<string, { nodeId: string; edgeId: string }>();
  const settled = new Set<string>();
  const queue = new MinHeap();
  queue.push(fromNodeId, 0);

  while (queue.size > 0) {
    const current = queue.pop()!;
    // The heap has no decrease-key, so a node can be queued more than once at different
    // distances. The first time it comes off the heap is its best one; ignore the rest.
    if (settled.has(current.nodeId)) continue;
    settled.add(current.nodeId);
    if (current.nodeId === toNodeId) break;

    for (const step of neighborsOf(graph, current.nodeId)) {
      if (settled.has(step.toNodeId)) continue;
      const distance = current.distance + step.distanceMeters;
      if (distance >= (best.get(step.toNodeId) ?? Infinity)) continue;
      best.set(step.toNodeId, distance);
      cameFrom.set(step.toNodeId, { nodeId: current.nodeId, edgeId: step.edgeId });
      queue.push(step.toNodeId, distance);
    }
  }

  if (!settled.has(toNodeId)) return null;

  const nodeIds = [toNodeId];
  const edgeIds: string[] = [];
  let cursor = toNodeId;
  while (cursor !== fromNodeId) {
    const previous = cameFrom.get(cursor)!;
    nodeIds.push(previous.nodeId);
    edgeIds.push(previous.edgeId);
    cursor = previous.nodeId;
  }
  nodeIds.reverse();
  edgeIds.reverse();

  return { nodeIds, edgeIds, totalDistanceMeters: best.get(toNodeId)! };
}

/**
 * Walking distance from one node to every node it can reach.
 *
 * Same search as `shortestPath` without an early exit. Ranking parking lots by how far they
 * are from a class needs one of these from the class, rather than one full search per lot --
 * a single pass answers for all of them at once.
 */
export function shortestPathTree(graph: WalkGraph, fromNodeId: string): Map<string, number> {
  const best = new Map<string, number>();
  if (!graph.nodeById.has(fromNodeId)) return best;

  best.set(fromNodeId, 0);
  const settled = new Set<string>();
  const queue = new MinHeap();
  queue.push(fromNodeId, 0);

  while (queue.size > 0) {
    const current = queue.pop()!;
    if (settled.has(current.nodeId)) continue;
    settled.add(current.nodeId);

    for (const step of neighborsOf(graph, current.nodeId)) {
      if (settled.has(step.toNodeId)) continue;
      const distance = current.distance + step.distanceMeters;
      if (distance >= (best.get(step.toNodeId) ?? Infinity)) continue;
      best.set(step.toNodeId, distance);
      queue.push(step.toNodeId, distance);
    }
  }

  return best;
}
