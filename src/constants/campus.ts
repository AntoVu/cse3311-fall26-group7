/**
 * The campus core: S Cooper St (west), UTA Blvd (north), S Center St (east), W Mitchell St
 * (south). Only this box is accurately traced (2026-09-18, against satellite imagery with the
 * team's Campus Digitizer); the rest of campus is still illustrative.
 *
 * **Must match the digitizer tool's own `CAMPUS_BOUNDS` exactly: never "tighten" it to fit
 * the data traced so far.** The digitizer stores every point as a fraction of this full
 * rectangle, so shrinking the box makes later-traced shapes unreachable and (since
 * CAMPUS_VIEWBOX's aspect comes from it) stretches every shape. A 2026-09-18 pass did exactly
 * that and had to be reverted. If the tool's box changes, change both together.
 */
export const CAMPUS_BOUNDS = {
  minLat: 32.7265,
  maxLat: 32.733875,
  minLng: -97.115286,
  maxLng: -97.106994,
} as const;

/**
 * The SVG viewBox coordinates are projected into: flat, arbitrary units, not real-world ones.
 *
 * Its width:height must match the pixel aspect of the calibration rectangle on the traced
 * image, NOT the real-world aspect of CAMPUS_BOUNDS, or every shape stretches. 1350 was
 * measured from Nedderman Hall (130x181 px on the source map). If shapes still look stretched,
 * measure another building and adjust this one number.
 */
export const CAMPUS_VIEWBOX = {
  width: 1350,
  height: 1000,
} as const;
