import type { CrowdZone } from '@/routing/foot-traffic';

const WEEKDAYS = [1, 2, 3, 4, 5];

/**
 * Known busy places and times for "Avoid crowds" (US-03), from what the team sees on campus
 * (2026-11-01): the plaza in front of the Central Library (north side, the Library Mall) and the
 * one outside the University Center (south side), weekdays 11 AM to 3 PM. Each circle sits on the
 * walkways where people gather, not on the building, so paths behind it stay clear. A data test
 * checks every zone covers a walkway.
 */
export const CROWD_ZONES: CrowdZone[] = [
  {
    id: 'library-mall',
    name: 'the Central Library',
    center: { lat: 32.7302, lng: -97.11293 },
    radiusMeters: 40,
    peaks: [{ days: WEEKDAYS, startMinute: 11 * 60, endMinute: 15 * 60 }],
  },
  {
    id: 'university-center',
    name: 'the University Center',
    center: { lat: 32.7310, lng: -97.1112 },
    radiusMeters: 40,
    peaks: [{ days: WEEKDAYS, startMinute: 11 * 60, endMinute: 15 * 60 }],
  },
];
