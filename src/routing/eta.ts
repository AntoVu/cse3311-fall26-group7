/** How long a distance takes to cover, for the ETA the schedule and parking screens show. */

/**
 * Average walking pace, in meters per second. 1.4 m/s (about 3.1 mph) is the usual figure for
 * an adult on level ground and matches what pedestrian routers assume. Campus walking is
 * slower in a crowd, which is what US-03's foot-traffic work will eventually account for.
 */
export const WALKING_METERS_PER_SECOND = 1.4;

/** Average casual cycling pace, in meters per second (about 9 mph). */
export const BIKING_METERS_PER_SECOND = 4.0;

export type TravelMode = 'walking' | 'biking';

const SPEEDS: Record<TravelMode, number> = {
  walking: WALKING_METERS_PER_SECOND,
  biking: BIKING_METERS_PER_SECOND,
};

/** Minutes to cover `meters` at the given pace. Not rounded -- callers decide how to show it. */
export function etaMinutes(meters: number, mode: TravelMode = 'walking'): number {
  return meters / SPEEDS[mode] / 60;
}
