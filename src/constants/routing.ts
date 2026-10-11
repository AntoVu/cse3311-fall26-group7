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
 * across campus, so a unit is about 2 m. They scale with zoom, so they are kept thin enough
 * (2026-10-11, halved) not to hide the paths and buildings underneath when zoomed in.
 */
export const ROUTE_LINE_WIDTH = 3.5;
/** A wider stroke drawn underneath, so the line stays readable over dark lots and buildings. */
export const ROUTE_CASING_WIDTH = 6;
export const ROUTE_MARKER_RADIUS = 7;

/** The same route drawn at one building's scale (the indoor map), where a unit is still ~2 m. */
export const INDOOR_ROUTE_SIZES = { line: 0.3, casing: 0.5, marker: 0.55 } as const;
