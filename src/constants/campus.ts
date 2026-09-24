import { CAMPUS_EXTENT } from '@/data/campus-extent';
import { metersPerDegreeLatitude, metersPerDegreeLongitude } from '@/routing/geo';

/**
 * The area the map covers: UTA's campus boundary plus a margin, computed from the imported
 * data by `npm run import:osm` (see src/data/campus-extent.ts).
 *
 * **These are real WGS84 coordinates.** That was not true before 2026-09-23: the data was
 * hand-traced with a digitizer that mapped the whole source PDF page onto a hardcoded box,
 * which squeezed everything into a rectangle far smaller than the page actually covered and
 * left buildings a median 865 ft (max 1,456 ft) from where they really are. Nothing derives
 * the bounds from a fixed guess any more -- change the area the map covers by re-importing,
 * not by editing numbers here.
 */
export const CAMPUS_BOUNDS = CAMPUS_EXTENT;

const centerLatitude = (CAMPUS_BOUNDS.minLat + CAMPUS_BOUNDS.maxLat) / 2;
const widthMeters =
  (CAMPUS_BOUNDS.maxLng - CAMPUS_BOUNDS.minLng) * metersPerDegreeLongitude(centerLatitude);
const heightMeters = (CAMPUS_BOUNDS.maxLat - CAMPUS_BOUNDS.minLat) * metersPerDegreeLatitude();

/**
 * The SVG viewBox the map draws into: flat, arbitrary units, north up.
 *
 * The width:height ratio is the bounding box's **real-world** ratio in meters, which is what
 * keeps shapes from stretching. `projectCoordinate` scales longitude and latitude
 * independently -- by `width / lngSpan` and `height / latSpan` -- so a square on the ground
 * only comes out square when `width / height` equals `widthMeters / heightMeters`. Setting it
 * from the real aspect here is what makes the projection isotropic, and
 * `projection.test.ts` holds that property down.
 *
 * A degree of longitude is shorter than a degree of latitude (about 93.5 km against 111.2 km
 * at this latitude), so the cos(latitude) factor inside `metersPerDegreeLongitude` is doing
 * the real work. An earlier version hardcoded 1350x1000, a number tuned by eye against a
 * building on the source PDF; it was compensating for the miscalibration described above.
 */
export const CAMPUS_VIEWBOX = {
  width: Math.round((widthMeters / heightMeters) * 1000),
  height: 1000,
};
