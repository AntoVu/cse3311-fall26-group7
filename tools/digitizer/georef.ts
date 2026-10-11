import { distanceMeters } from '../../src/routing/geo.ts';

/**
 * Georeferencing for the Campus Digitizer: how a point on the traced image becomes a real
 * lat/lng.
 *
 * Image positions are **fractions** of the image, `u = x / width` and `v = y / height`, so one
 * transform fits every render of the same PDF page at any resolution. The transform is a full
 * affine (six numbers), which can express the PATS map's slight rotation against true north.
 * The Iteration 1 digitizer used two corner clicks instead, which cannot, and that is how its
 * data ended up hundreds of feet off (see CLAUDE.md, "Campus map data").
 *
 * The digitizer artifact carries a copy of this math in plain JS, since it cannot import from
 * the repo. This file is the tested reference that copy is checked against.
 */

/** `value = a * u + b * v + c`, one set of terms per output coordinate. */
export type AffineTerms = { a: number; b: number; c: number };
export type Georef = { lat: AffineTerms; lng: AffineTerms };

/** One landmark: where it is on the image, and where it really is. */
export type ControlPair = { u: number; v: number; lat: number; lng: number };

export function toLatLng(georef: Georef, u: number, v: number): { lat: number; lng: number } {
  return {
    lat: georef.lat.a * u + georef.lat.b * v + georef.lat.c,
    lng: georef.lng.a * u + georef.lng.b * v + georef.lng.c,
  };
}

/** The inverse of `toLatLng`: where a real coordinate falls on the image. */
export function toImage(georef: Georef, lat: number, lng: number): { u: number; v: number } {
  const { a: la, b: lb, c: lc } = georef.lat;
  const { a: ga, b: gb, c: gc } = georef.lng;
  const det = la * gb - lb * ga;
  const dLat = lat - lc;
  const dLng = lng - gc;
  return {
    u: (gb * dLat - lb * dLng) / det,
    v: (la * dLng - ga * dLat) / det,
  };
}

/** Solves a 3x3 system by Cramer's rule. */
function solve3(m: number[][], rhs: number[]): number[] {
  const det = (x: number[][]) =>
    x[0][0] * (x[1][1] * x[2][2] - x[1][2] * x[2][1]) -
    x[0][1] * (x[1][0] * x[2][2] - x[1][2] * x[2][0]) +
    x[0][2] * (x[1][0] * x[2][1] - x[1][1] * x[2][0]);
  const d = det(m);
  return [0, 1, 2].map((column) =>
    det(m.map((row, i) => row.map((value, j) => (j === column ? rhs[i] : value)))) / d
  );
}

/**
 * Least-squares affine through the control pairs. Three pairs fix it exactly; more average
 * out click error, and `residualsMeters` then shows which landmark disagrees.
 */
export function fitAffine(pairs: ControlPair[]): Georef {
  if (pairs.length < 3) {
    throw new Error(`An affine fit needs at least 3 landmark pairs; got ${pairs.length}.`);
  }

  // Normal equations over the basis [u, v, 1].
  const normal = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const latRhs = [0, 0, 0];
  const lngRhs = [0, 0, 0];
  for (const { u, v, lat, lng } of pairs) {
    const basis = [u, v, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) normal[i][j] += basis[i] * basis[j];
      latRhs[i] += basis[i] * lat;
      lngRhs[i] += basis[i] * lng;
    }
  }

  // The (u, v) spread is what the fit leans on. When the points all sit on one line, the
  // determinant collapses relative to that spread and the fit would be meaningless.
  const spread = normal[0][0] * normal[1][1];
  const det =
    normal[0][0] * (normal[1][1] * normal[2][2] - normal[1][2] * normal[2][1]) -
    normal[0][1] * (normal[1][0] * normal[2][2] - normal[1][2] * normal[2][0]) +
    normal[0][2] * (normal[1][0] * normal[2][1] - normal[1][1] * normal[2][0]);
  if (Math.abs(det) <= 1e-9 * Math.max(spread, 1e-12) * pairs.length) {
    throw new Error('The landmarks all sit on one line; pick some spread across the image.');
  }

  const [la, lb, lc] = solve3(normal, latRhs);
  const [ga, gb, gc] = solve3(normal, lngRhs);
  return { lat: { a: la, b: lb, c: lc }, lng: { a: ga, b: gb, c: gc } };
}

/** How far each pair's real position is from where the transform puts it, in meters. */
export function residualsMeters(georef: Georef, pairs: ControlPair[]): number[] {
  return pairs.map((pair) => distanceMeters(toLatLng(georef, pair.u, pair.v), pair));
}

/**
 * A georeference that bends locally. The PATS map is a drawing, not a survey: its core lines
 * up with reality to a few meters, but toward the page edges whole blocks sit 20-30 m off
 * where any single affine would put them. So each point gets its own affine, fitted with the
 * nearby landmarks weighted most (moving least squares). `affine` is the global fit, used as
 * the starting guess when inverting.
 */
export type LocalGeoref = {
  affine: Georef;
  controlPoints: ControlPair[];
  /** Gaussian falloff, as a fraction of the image width. */
  sigma: number;
  /** Image height / width, so the falloff is round on the page rather than stretched. */
  aspect?: number;
};

/** Below this, a landmark's weight stops mattering, but it still keeps the fit well posed. */
const WEIGHT_FLOOR = 1e-6;

export function localToLatLng(georef: LocalGeoref, u: number, v: number): { lat: number; lng: number } {
  const aspect = georef.aspect ?? 1;
  const twoSigmaSquared = 2 * georef.sigma * georef.sigma;

  const normal = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const latRhs = [0, 0, 0];
  const lngRhs = [0, 0, 0];
  for (const p of georef.controlPoints) {
    const d2 = (p.u - u) ** 2 + ((p.v - v) * aspect) ** 2;
    const w = Math.exp(-d2 / twoSigmaSquared) + WEIGHT_FLOOR;
    const basis = [p.u, p.v, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) normal[i][j] += w * basis[i] * basis[j];
      latRhs[i] += w * basis[i] * p.lat;
      lngRhs[i] += w * basis[i] * p.lng;
    }
  }

  const [la, lb, lc] = solve3(normal, latRhs);
  const [ga, gb, gc] = solve3(normal, lngRhs);
  return { lat: la * u + lb * v + lc, lng: ga * u + gb * v + gc };
}

/**
 * The inverse of `localToLatLng`. There is no closed form, so start from the global affine's
 * answer and repeatedly correct by how far the local map lands from the target. The local map
 * is the global one plus a gentle bend, so this settles in a few rounds.
 */
export function localToImage(georef: LocalGeoref, lat: number, lng: number): { u: number; v: number } {
  const target = toImage(georef.affine, lat, lng);
  let { u, v } = target;
  for (let round = 0; round < 8; round++) {
    const landed = localToLatLng(georef, u, v);
    const landedOnImage = toImage(georef.affine, landed.lat, landed.lng);
    const du = target.u - landedOnImage.u;
    const dv = target.v - landedOnImage.v;
    u += du;
    v += dv;
    if (Math.abs(du) + Math.abs(dv) < 1e-10) break;
  }
  return { u, v };
}
