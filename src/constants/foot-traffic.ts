import type { CrowdPeak, CrowdZone } from '@/routing/foot-traffic';

// Monday to Thursday at full strength, Friday lighter (fewer classes), weekends off.
const PEAKS: CrowdPeak[] = [
  { days: [1, 2, 3, 4], startMinute: 11 * 60, endMinute: 15 * 60 },
  { days: [5], startMinute: 11 * 60, endMinute: 15 * 60, factor: 2 },
];

/**
 * Known busy places and times for "Avoid crowds" (US-03), from what the team sees on campus
 * (2026-11-01, boxes Anthony drew on the map): the walkway along the west side of the Central
 * Library and the one along the south side of the University Center, weekdays 11 AM to 3 PM,
 * lighter on Fridays. A data test checks every zone covers a walkway.
 */
export const CROWD_ZONES: CrowdZone[] = [
  {
    id: 'library-mall',
    name: 'the Central Library',
    bounds: { north: 32.73029, south: 32.72912, west: -97.11351, east: -97.1132 },
    peaks: PEAKS,
  },
  {
    id: 'university-center',
    name: 'the University Center',
    bounds: { north: 32.7312, south: 32.73096, west: -97.11263, east: -97.10993 },
    peaks: PEAKS,
  },
];
