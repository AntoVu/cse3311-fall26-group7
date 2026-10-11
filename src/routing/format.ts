import type { DistanceUnit } from '@/state/distance-unit';

const METERS_PER_MILE = 1609.344;

export function formatDistance(distanceMeters: number, unit: DistanceUnit): string {
  if (unit === 'imperial') {
    const miles = distanceMeters / METERS_PER_MILE;
    const roundedMiles = Number(miles.toFixed(1));
    return `${roundedMiles.toFixed(1)} ${roundedMiles === 1 ? 'mile' : 'miles'}`;
  }

  if (distanceMeters < 400) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
}
