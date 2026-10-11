import {
  fitAffine,
  localToImage,
  localToLatLng,
  residualsMeters,
  toImage,
  toLatLng,
  type Georef,
  type LocalGeoref,
} from '../georef';

// A made-up but realistic transform: the page spans about 0.03 degrees of longitude and
// 0.02 of latitude, rotated a little, the way the PATS map sits against true north.
const KNOWN: Georef = {
  lat: { a: -0.0003, b: -0.0195, c: 32.738 },
  lng: { a: 0.0312, b: -0.0004, c: -97.135 },
};

const SAMPLE_UVS = [
  [0.1, 0.1],
  [0.9, 0.15],
  [0.5, 0.5],
  [0.2, 0.85],
  [0.8, 0.9],
];

function pairsFrom(georef: Georef) {
  return SAMPLE_UVS.map(([u, v]) => ({ u, v, ...toLatLng(georef, u, v) }));
}

describe('toLatLng', () => {
  it('maps the image origin to the constant terms', () => {
    expect(toLatLng(KNOWN, 0, 0)).toEqual({ lat: 32.738, lng: -97.135 });
  });

  it('applies both image axes to each coordinate', () => {
    const { lat, lng } = toLatLng(KNOWN, 1, 1);
    expect(lat).toBeCloseTo(32.738 - 0.0003 - 0.0195, 9);
    expect(lng).toBeCloseTo(-97.135 + 0.0312 - 0.0004, 9);
  });
});

describe('toImage', () => {
  it('undoes toLatLng', () => {
    for (const [u, v] of SAMPLE_UVS) {
      const { lat, lng } = toLatLng(KNOWN, u, v);
      const back = toImage(KNOWN, lat, lng);
      expect(back.u).toBeCloseTo(u, 9);
      expect(back.v).toBeCloseTo(v, 9);
    }
  });
});

describe('fitAffine', () => {
  it('recovers a transform exactly from points it generated', () => {
    const fitted = fitAffine(pairsFrom(KNOWN));
    for (const axis of ['lat', 'lng'] as const) {
      for (const term of ['a', 'b', 'c'] as const) {
        expect(fitted[axis][term]).toBeCloseTo(KNOWN[axis][term], 9);
      }
    }
  });

  it('needs at least three pairs, since two cannot fix a rotation and a skew', () => {
    expect(() => fitAffine(pairsFrom(KNOWN).slice(0, 2))).toThrow(/at least 3/);
  });

  it('refuses points that all sit on one line', () => {
    const collinear = [0.1, 0.4, 0.7].map((t) => ({ u: t, v: t, ...toLatLng(KNOWN, t, t) }));
    expect(() => fitAffine(collinear)).toThrow(/line/);
  });
});

describe('residualsMeters', () => {
  it('is zero for pairs the transform explains exactly', () => {
    for (const residual of residualsMeters(KNOWN, pairsFrom(KNOWN))) {
      expect(residual).toBeCloseTo(0, 6);
    }
  });

  it('reports how far a mismatched pair lands, in meters', () => {
    const [first] = pairsFrom(KNOWN);
    // About 11.1 m north of where the transform puts it.
    const [residual] = residualsMeters(KNOWN, [{ ...first, lat: first.lat + 0.0001 }]);
    expect(residual).toBeCloseTo(11.1, 0);
  });
});

describe('local georeference (moving least squares)', () => {
  // A grid of landmarks across the page, all obeying KNOWN.
  const grid = [0, 0.25, 0.5, 0.75, 1].flatMap((u) =>
    [0, 0.25, 0.5, 0.75, 1].map((v) => ({ u, v, ...toLatLng(KNOWN, u, v) }))
  );
  const exact: LocalGeoref = { affine: KNOWN, controlPoints: grid, sigma: 0.12 };

  it('agrees with the affine when every landmark obeys it', () => {
    const local = localToLatLng(exact, 0.37, 0.61);
    const global = toLatLng(KNOWN, 0.37, 0.61);
    expect(local.lat).toBeCloseTo(global.lat, 9);
    expect(local.lng).toBeCloseTo(global.lng, 9);
  });

  // The printed map is drawn, not surveyed, so one corner of it can sit tens of meters off
  // where a single affine puts it. The local fit has to follow that.
  it('follows a region that is shifted away from the global fit', () => {
    const shifted = grid.map((p) =>
      p.u <= 0.25 && p.v >= 0.75 ? { ...p, lat: p.lat + 0.0003, lng: p.lng + 0.0003 } : p
    );
    const warped: LocalGeoref = { affine: KNOWN, controlPoints: shifted, sigma: 0.12 };
    const corner = { u: 0, v: 1, ...toLatLng(KNOWN, 0, 1) };

    const offGlobal = residualsMeters(KNOWN, [{ ...corner, lat: corner.lat + 0.0003, lng: corner.lng + 0.0003 }])[0];
    const local = localToLatLng(warped, 0, 1);
    expect(local.lat - corner.lat).toBeGreaterThan(0.0002);
    expect(offGlobal).toBeGreaterThan(40);
  });

  it('inverts back to the image position', () => {
    const shifted = grid.map((p) => (p.u < 0.3 ? { ...p, lng: p.lng + 0.0002 } : p));
    const warped: LocalGeoref = { affine: KNOWN, controlPoints: shifted, sigma: 0.12 };
    for (const [u, v] of SAMPLE_UVS) {
      const { lat, lng } = localToLatLng(warped, u, v);
      const back = localToImage(warped, lat, lng);
      expect(back.u).toBeCloseTo(u, 5);
      expect(back.v).toBeCloseTo(v, 5);
    }
  });
});
