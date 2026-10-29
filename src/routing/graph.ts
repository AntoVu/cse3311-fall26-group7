import { distanceMeters } from '@/routing/geo';
import type { Coordinate, MapEdge, MapNode } from '@/types/map';

/**
 * The walkable graph, in the shape a search wants to read it.
 *
 * The stored data lists each edge once, from one node to another, but a sidewalk is walkable
 * both ways -- so building the graph records each edge under both of its endpoints.
 */

/** One move away from a node: which edge you take and where you end up. */
export type GraphStep = {
  edgeId: string;
  toNodeId: string;
  distanceMeters: number;
  /** What the search pays for it: `MapEdge.costMeters`, else its length. */
  costMeters: number;
  /** Staff only (a keycard door): skipped unless staff-only paths are allowed. */
  restricted?: true;
};

export type WalkGraph = {
  nodeById: Map<string, MapNode>;
  edgeById: Map<string, MapEdge>;
  stepsByNode: Map<string, GraphStep[]>;
  /** A building's POI id -> its entrance node ids, so routes can end at a door. */
  entrancesByPoiId: Map<string, string[]>;
};

/**
 * How far from the graph a start or destination may sit and still be routable. Every building
 * and lot on the map is within 80 m of a walkway (there is a test for that), so this only
 * needs to be generous enough to cover a dropped pin in the middle of a field.
 */
export const DEFAULT_SNAP_METERS = 150;

export function buildGraph(nodes: MapNode[], edges: MapEdge[]): WalkGraph {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const stepsByNode = new Map<string, GraphStep[]>();

  const addStep = (from: string, step: GraphStep) => {
    const steps = stepsByNode.get(from);
    if (steps) steps.push(step);
    else stepsByNode.set(from, [step]);
  };

  for (const edge of edges) {
    // An edge is only usable when both of its ends are real nodes we can stand on.
    if (!edge.walkable || !nodeById.has(edge.fromNodeId) || !nodeById.has(edge.toNodeId)) continue;
    const costMeters = edge.costMeters ?? edge.distanceMeters;
    // A door may be one-way (`none`) or keycard-only (`staff`) in either direction.
    const step = (from: string, toNodeId: string, rule?: 'staff' | 'none') => {
      if (rule === 'none') return;
      addStep(from, {
        edgeId: edge.id,
        toNodeId,
        distanceMeters: edge.distanceMeters,
        costMeters,
        ...(rule === 'staff' && { restricted: true as const }),
      });
    };
    step(edge.fromNodeId, edge.toNodeId, edge.access?.forward);
    step(edge.toNodeId, edge.fromNodeId, edge.access?.backward);
  }

  const entrancesByPoiId = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.entranceOf || !stepsByNode.has(node.id)) continue;
    entrancesByPoiId.set(node.entranceOf, [...(entrancesByPoiId.get(node.entranceOf) ?? []), node.id]);
  }

  return { nodeById, edgeById, stepsByNode, entrancesByPoiId };
}

export function neighborsOf(graph: WalkGraph, nodeId: string): GraphStep[] {
  return graph.stepsByNode.get(nodeId) ?? [];
}

export type SnapResult = {
  nodeId: string;
  /** How far the walk from the given coordinate onto the graph is. */
  distanceMeters: number;
};

/**
 * Finds the nearest node a route could actually start from.
 *
 * Nodes with no edges are skipped: they are closer to nothing useful, and snapping to one
 * would hand the search a start it can never leave. Indoor nodes are skipped too: a GPS fix or
 * a start point is outdoors, and a hallway node under it could be on any floor. Indoor nodes
 * are reached through the entrances instead.
 */
export function snapToGraph(
  graph: WalkGraph,
  coordinate: Coordinate,
  maxMeters: number = DEFAULT_SNAP_METERS
): SnapResult | null {
  let best: SnapResult | null = null;

  for (const node of graph.nodeById.values()) {
    if (node.level !== undefined || neighborsOf(graph, node.id).length === 0) continue;
    const distance = distanceMeters(coordinate, node.coordinate);
    if (distance > maxMeters) continue;
    if (!best || distance < best.distanceMeters) {
      best = { nodeId: node.id, distanceMeters: distance };
    }
  }

  return best;
}
