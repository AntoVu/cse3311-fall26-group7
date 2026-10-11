import type { WalkGraph } from '@/routing/graph';
import type { MapNode } from '@/types/map';

/** Room numbers are typed by hand, so "205a" and " 205A" are the same room as "205A". */
const normalize = (room: string) => room.replace(/\s+/g, '').toUpperCase();

/** The door node of a room in a building, or null when that room is not mapped indoors. */
export function findRoomNode(graph: WalkGraph, poiId: string, room: string): MapNode | null {
  const wanted = normalize(room);
  if (!wanted) return null;
  for (const node of graph.nodeById.values()) {
    if (node.poiId === poiId && node.room !== undefined && normalize(node.room) === wanted) return node;
  }
  return null;
}

/** Whether a building has been traced indoors at all. */
export function hasIndoorMap(graph: WalkGraph, poiId: string): boolean {
  for (const node of graph.nodeById.values()) {
    if (node.poiId === poiId && node.level !== undefined) return true;
  }
  return false;
}
