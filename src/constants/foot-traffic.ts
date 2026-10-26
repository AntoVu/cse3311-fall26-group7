import type { CrowdZone } from '@/routing/foot-traffic';

const WEEKDAYS = [1, 2, 3, 4, 5];

/**
 * Known busy places and times for "Avoid crowds" (US-03). Estimates, not measurements: the
 * inception document's example (the library front around noon) and the University Center at
 * lunch. Add a zone as the team sees one on campus; poiId must be a building on the map (a data
 * test checks).
 */
export const CROWD_ZONES: CrowdZone[] = [
  {
    id: 'library-mall',
    name: 'the Central Library',
    poiId: 'academic-central-library',
    radiusMeters: 70,
    peaks: [{ days: WEEKDAYS, startMinute: 11 * 60, endMinute: 13 * 60 + 30 }],
  },
  {
    id: 'university-center',
    name: 'the University Center',
    poiId: 'academic-university-center',
    radiusMeters: 60,
    peaks: [{ days: WEEKDAYS, startMinute: 11 * 60, endMinute: 14 * 60 }],
  },
];
