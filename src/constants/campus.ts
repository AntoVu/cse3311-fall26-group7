/**
 * A bounding box around the core of UT Arlington's campus — bounded by
 * S Cooper St (west), UTA Blvd (north), S Center St (east), and W Mitchell St
 * (south). This is the area the team asked to get mapped accurately first;
 * the rest of campus (and the off-campus UTA Blvd apartments) is still
 * illustrative/unmapped.
 *
 * **These numbers MUST exactly match the `CAMPUS_BOUNDS` constant hardcoded
 * inside the Campus Digitizer tool** (`tools/campus-digitizer.html`, or
 * wherever the team is keeping it) — do not "tighten" this to fit whatever
 * data has been traced so far. Every traced lat/lng is computed by the
 * digitizer as `fraction-of-the-way between your two calibration clicks`,
 * mapped into *that* box, which is the full Cooper/UTA Blvd/Center/Mitchell
 * rectangle, not just whatever subset of buildings happens to be traced at
 * any given time. Fitting these bounds to only the currently-traced data
 * (as a prior version of this file did) breaks two things at once: (1) it
 * clips off anything traced later that falls outside that tighter box
 * (buildings/streets become unreachable even when panned all the way), and
 * (2) since CAMPUS_VIEWBOX's aspect ratio is derived from these bounds, a
 * tighter box gives the wrong aspect ratio for data that was calibrated
 * against the *full* box — every shape renders visibly stretched (e.g. a
 * traced 45° corner no longer looks like 45°). If the digitizer tool's own
 * `CAMPUS_BOUNDS` ever changes, update both together.
 *
 * Re-digitized 2026-09-18 (branch UpdatedMapIntegration) — the original
 * bounds/data (digitized from the 2019 PDF) were replaced wholesale with a
 * retrace against satellite imagery using the team's own Campus Digitizer
 * tool. Positions here are still not a GPS survey — hand-tracing has its own
 * margin of error — but should be noticeably closer to reality than the old
 * PDF trace was.
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
 * The width:height ratio must equal the pixel aspect ratio of the
 * *calibration rectangle on the image the data was traced from* — NOT the
 * real-world aspect of CAMPUS_BOUNDS. The digitizer stores each point as a
 * fraction of that rectangle, so rendering the fractions back into a box of
 * the same aspect reproduces the source image; any other ratio stretches
 * every shape. (An earlier version derived 946:1000 from the bounds' lat/lng
 * span in feet, which assumed the source image had that aspect — it didn't,
 * and shapes came out ~1.43x too tall.)
 *
 * 1350 was measured 2026-09-18 from Nedderman Hall: 130x181 px on the source
 * map, while the same footprint in the app at 946x1000 came out 130x~258.
 * That puts the source rectangle at ~1352:1000. If shapes still look
 * stretched, measure another building and adjust this one number.
 */
export const CAMPUS_VIEWBOX = {
  width: 1350,
  height: 1000,
} as const;
