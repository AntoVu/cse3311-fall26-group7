/**
 * Turning route numbers into the words a screen shows.
 *
 * Imperial for now, because UTA is in Texas and the Settings > Measurement Units screen is
 * still local state that changes nothing. When that gets wired up, this is the one place that
 * has to learn about it.
 */

const FEET_PER_METER = 3.28084;
const FEET_PER_MILE = 5280;

/** Short walks read better in feet; past a quarter mile, miles are easier to judge. */
const MILES_ABOVE_FEET = 0.25;

export function formatDistance(meters: number): string {
  const feet = meters * FEET_PER_METER;
  const miles = feet / FEET_PER_MILE;
  if (miles < MILES_ABOVE_FEET) return `${Math.round(feet / 10) * 10} ft`;
  return `${miles.toFixed(1)} mi`;
}

/** Rounds up, because "0 min" reads as though you are already there. */
export function formatDuration(minutes: number): string {
  const rounded = Math.max(1, Math.round(minutes));
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
