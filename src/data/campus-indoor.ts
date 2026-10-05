import type { MapEdge, MapNode } from '@/types/map';

/**
 * GENERATED FILE -- do not edit by hand. Rebuild with `npm run import:osm`.
 * Built from src/data/indoor-edits.json, traced in the Indoor Digitizer.
 *
 * Indoor hallways, doors, stairs and elevators. Every node has a `level`; entrances are
 * edges from an outdoor walkway node (an `n` id) into a hallway.
 */
export const INDOOR_NODES: MapNode[] = [];

export const INDOOR_EDGES: MapEdge[] = [];
