/**
 * A bounding box around the core of UT Arlington's campus — bounded by
 * S Cooper St (west), UTA Blvd (north), S Center St (east), and W Mitchell St
 * (south). This is the area the team asked to get mapped accurately first;
 * the rest of campus (and the off-campus UTA Blvd apartments) is still
 * illustrative/unmapped.
 *
 * These bounds, and every building/lot/street coordinate derived from them
 * (src/mocks/campus-pois.ts, campus-lots.ts, campus-streets.ts), come from
 * digitizing the official 2019 UT Arlington campus map PDF
 * (uta.edu/pats/_documents/UT%20Arlington%20Campus%20Map.pdf) pixel-by-pixel,
 * then anchoring that pixel space to real-world lat/lng using two buildings
 * inside the box with known, independently-geotagged coordinates (Nedderman
 * Hall and College Park Center, both per Wikipedia's infobox coordinates) and
 * assuming a uniform real-world scale (the map has no printed scale bar).
 *
 * That makes RELATIVE positions/shapes/adjacency within the box trustworthy —
 * they come straight off the university's own drawing. The ABSOLUTE lat/lng
 * values are a best-effort estimate, not a GPS survey: expect them to be off
 * by up to roughly 50-100 ft if checked against a live GPS reading. Good
 * enough for this app's own SVG rendering (which never touches a real map
 * tile), not something to feed into a third-party maps API as-is.
 */
export const CAMPUS_BOUNDS = {
  minLat: 32.7265,
  maxLat: 32.733875,
  minLng: -97.115286,
  maxLng: -97.106994,
} as const;

/**
 * The SVG viewBox the campus map is drawn in — an arbitrary flat coordinate
 * space, not real-world units. Coordinates get projected into this box.
 *
 * The width:height ratio (946:1000) matches the source map's own pixel
 * aspect ratio for this box, so buildings/streets render at their correct
 * relative proportions instead of being stretched.
 */
export const CAMPUS_VIEWBOX = {
  width: 946,
  height: 1000,
} as const;
