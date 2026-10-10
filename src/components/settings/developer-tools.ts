import { formatTime } from '@/components/settings/time-format';
import { floorRank } from '@/routing/floors';
import type { MapNode } from '@/types/map';

const LAST_MINUTE = 24 * 60 - 1;

/** A test class that starts in 30 minutes and ends in 90, as "2:30 PM" / "3:30 PM". */
export function testClassTimes(now: Date): { startTime: string; endTime: string } {
  const minutes = now.getHours() * 60 + now.getMinutes();
  // ponytail: clamped to 11:59 PM because the schedule has no dates; a late-night class just gets shorter.
  const end = Math.min(minutes + 90, LAST_MINUTE);
  const start = Math.min(minutes + 30, end - 1);
  return { startTime: formatTime(start), endTime: formatTime(end) };
}

/** A building's rooms on each traced floor, floors bottom up, each room once in number order. */
export function buildingRooms(nodes: MapNode[], poiId: string): { level: string; rooms: string[] }[] {
  const byLevel = new Map<string, Set<string>>();
  for (const node of nodes) {
    if (node.poiId !== poiId || node.level === undefined || node.room === undefined) continue;
    byLevel.set(node.level, (byLevel.get(node.level) ?? new Set()).add(node.room));
  }
  return [...byLevel]
    .sort(([a], [b]) => floorRank(a) - floorRank(b))
    .map(([level, rooms]) => ({
      level,
      rooms: [...rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    }));
}
