/** Colors and sizes for the drawn route. Kept here so both map tabs and the legends agree. */
export const ROUTE_COLORS = {
  /** The route line itself. Blue reads as "your path" on every map people already use. */
  line: '#3C87F7',
  /** Where the walk begins. */
  start: '#22C55E',
  /** Where it ends. */
  destination: '#E5484D',
} as const;

/**
 * Stroke widths in SVG viewBox units, not pixels. The map is drawn at roughly 1,370 units
 * across campus, so a unit is about 2 m -- these are deliberately chunky enough to stay
 * visible when zoomed out to the whole campus.
 */
export const ROUTE_LINE_WIDTH = 6;
/** A wider stroke drawn underneath, so the line stays readable over dark lots and buildings. */
export const ROUTE_CASING_WIDTH = 11;
export const ROUTE_MARKER_RADIUS = 9;

/** The same route drawn at one building's scale (the indoor map), where a unit is still ~2 m. */
export const INDOOR_ROUTE_SIZES = { line: 0.45, casing: 0.8, marker: 0.7 } as const;
