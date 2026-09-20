import { projectCoordinate, projectPath } from '@/components/map/projection';
import { CAMPUS_BOUNDS, CAMPUS_VIEWBOX } from '@/constants/campus';

const { minLat, maxLat, minLng, maxLng } = CAMPUS_BOUNDS;

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
