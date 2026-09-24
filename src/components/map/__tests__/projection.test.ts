import { projectCoordinate, projectPath, unprojectPoint } from '@/components/map/projection';
import { CAMPUS_BOUNDS, CAMPUS_VIEWBOX } from '@/constants/campus';
import { distanceMeters } from '@/routing/geo';

const { minLat, maxLat, minLng, maxLng } = CAMPUS_BOUNDS;

const centerLat = (minLat + maxLat) / 2;
const centerLng = (minLng + maxLng) / 2;

/** How many viewBox units one meter covers, going from `from` toward `to`. */
function unitsPerMeter(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const a = projectCoordinate(from);
  const b = projectCoordinate(to);
  return Math.hypot(b.x - a.x, b.y - a.y) / distanceMeters(from, to);
}

describe('projectCoordinate', () => {
  it('maps the north-west corner of the bounds to the viewBox origin', () => {
    const { x, y } = projectCoordinate({ lat: maxLat, lng: minLng });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });

  it('maps the south-east corner of the bounds to the far viewBox corner', () => {
    const { x, y } = projectCoordinate({ lat: minLat, lng: maxLng });
    expect(x).toBeCloseTo(CAMPUS_VIEWBOX.width);
    expect(y).toBeCloseTo(CAMPUS_VIEWBOX.height);
  });

  it('maps the center of the bounds to the center of the viewBox', () => {
    const { x, y } = projectCoordinate({
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    });
    expect(x).toBeCloseTo(CAMPUS_VIEWBOX.width / 2);
    expect(y).toBeCloseTo(CAMPUS_VIEWBOX.height / 2);
  });

  it('puts north at the top: a higher latitude has a smaller y', () => {
    const north = projectCoordinate({ lat: maxLat, lng: minLng });
    const south = projectCoordinate({ lat: minLat, lng: minLng });
    expect(north.y).toBeLessThan(south.y);
  });

  it('puts east on the right: a higher longitude has a larger x', () => {
    const west = projectCoordinate({ lat: minLat, lng: minLng });
    const east = projectCoordinate({ lat: minLat, lng: maxLng });
    expect(east.x).toBeGreaterThan(west.x);
  });

  // The property that stops buildings looking stretched. It holds only because
  // CAMPUS_VIEWBOX's aspect is the bounding box's real-world aspect in meters -- if someone
  // hardcodes that ratio again (there used to be a 1350x1000 fudge), this fails.
  it('stretches north-south and east-west by the same amount', () => {
    const center = { lat: centerLat, lng: centerLng };
    const north = { lat: centerLat + 0.001, lng: centerLng };
    const east = { lat: centerLat, lng: centerLng + 0.001 };

    const vertical = unitsPerMeter(center, north);
    const horizontal = unitsPerMeter(center, east);
    expect(horizontal / vertical).toBeCloseTo(1, 2);
  });

  it('keeps a square on the ground square on the map', () => {
    // A 200 m square, drawn from its north-west corner.
    const sideMeters = 200;
    const latSide = sideMeters / 111_194.9;
    const lngSide = sideMeters / (111_194.9 * Math.cos((centerLat * Math.PI) / 180));

    const northWest = projectCoordinate({ lat: centerLat, lng: centerLng });
    const northEast = projectCoordinate({ lat: centerLat, lng: centerLng + lngSide });
    const southWest = projectCoordinate({ lat: centerLat - latSide, lng: centerLng });

    const width = Math.abs(northEast.x - northWest.x);
    const height = Math.abs(southWest.y - northWest.y);
    expect(width / height).toBeCloseTo(1, 2);
  });
});

describe('projectPath', () => {
  it('projects every point and keeps their order', () => {
    const path = [
      { lat: maxLat, lng: minLng },
      { lat: minLat, lng: maxLng },
    ];
    const projected = projectPath(path);
    expect(projected).toHaveLength(2);
    expect(projected[0]).toEqual(projectCoordinate(path[0]));
    expect(projected[1]).toEqual(projectCoordinate(path[1]));
  });

  it('returns an empty array for an empty path', () => {
    expect(projectPath([])).toEqual([]);
  });
});

describe('unprojectPoint', () => {
  it('undoes projectCoordinate', () => {
    for (const coordinate of [
      { lat: centerLat, lng: centerLng },
      { lat: maxLat, lng: minLng },
      { lat: minLat, lng: maxLng },
      { lat: 32.7324766, lng: -97.1138654 },
    ]) {
      const round = unprojectPoint(projectCoordinate(coordinate));
      expect(round.lat).toBeCloseTo(coordinate.lat, 9);
      expect(round.lng).toBeCloseTo(coordinate.lng, 9);
    }
  });

  it('reads the viewBox corners as the bounds corners', () => {
    expect(unprojectPoint({ x: 0, y: 0 })).toEqual({ lat: maxLat, lng: minLng });
    const far = unprojectPoint({ x: CAMPUS_VIEWBOX.width, y: CAMPUS_VIEWBOX.height });
    expect(far.lat).toBeCloseTo(minLat, 9);
    expect(far.lng).toBeCloseTo(maxLng, 9);
  });
});
