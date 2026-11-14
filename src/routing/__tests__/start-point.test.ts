import { filterStartPointOptions, resolveStartPoint, startPointOptions } from '@/routing/start-point';
import type { CampusLot, PointOfInterest } from '@/types/map';

const HALL: PointOfInterest = {
  id: 'residence-arlington-hall',
  name: 'Arlington Hall',
  category: 'residence',
  coordinate: { lat: 32.7311, lng: -97.1093 },
  footprints: [],
};
const APARTMENT: PointOfInterest = {
  id: 'apartment-timber-brook',
  name: 'Timber Brook',
  category: 'apartment',
  coordinate: { lat: 32.7337, lng: -97.1198 },
  footprints: [],
};
const CLASSROOM: PointOfInterest = {
  id: 'academic-nedderman-hall',
  name: 'Nedderman Hall',
  abbreviation: 'NH',
  category: 'academic',
  coordinate: { lat: 32.7324, lng: -97.1138 },
  footprints: [],
};
const LOT: CampusLot = {
  id: 'lot-park-north',
  label: 'Park North',
  coordinate: { lat: 32.7332, lng: -97.1076 },
  footprints: [],
};
const UNIDENTIFIED_LOT: CampusLot = {
  id: 'lot-osm-123',
  label: '',
  coordinate: { lat: 32.73, lng: -97.11 },
  footprints: [],
};

const pois = [HALL, APARTMENT, CLASSROOM];
const lots = [LOT, UNIDENTIFIED_LOT];
const here = { lat: 32.7305, lng: -97.112 };

describe('resolveStartPoint', () => {
  const context = { pois, lots, userLocation: here };

  it('resolves a residence hall to its name and position', () => {
    expect(resolveStartPoint({ kind: 'building', poiId: HALL.id }, context)).toEqual({
      label: 'Arlington Hall',
      coordinate: HALL.coordinate,
      placeId: HALL.id,
    });
  });

  it('resolves a parking lot', () => {
    expect(resolveStartPoint({ kind: 'lot', lotId: LOT.id }, context)).toEqual({
      label: 'Park North',
      coordinate: LOT.coordinate,
      placeId: LOT.id,
    });
  });

  it('resolves the current location when one is known', () => {
    expect(resolveStartPoint({ kind: 'currentLocation' }, context)).toEqual({
      label: 'Current Location',
      coordinate: here,
    });
  });

  it('resolves a dropped pin to its own coordinate', () => {
    const pin = { lat: 32.7299, lng: -97.1101 };
    expect(resolveStartPoint({ kind: 'pin', coordinate: pin }, context)).toEqual({
      label: 'Dropped Pin',
      coordinate: pin,
    });
  });

  it('resolves a room to its door node, labeled with the building', () => {
    const door = { id: 'i7', coordinate: { lat: 32.7325, lng: -97.1139 }, room: '228' };
    const findRoom = (poiId: string, room: string) =>
      poiId === CLASSROOM.id && room === '228' ? door : null;
    const room = { kind: 'room', poiId: CLASSROOM.id, room: '228' } as const;

    expect(resolveStartPoint(room, { ...context, findRoom })).toEqual({
      label: 'Nedderman Hall 228',
      coordinate: door.coordinate,
      nodeId: 'i7',
      placeId: CLASSROOM.id,
    });
    expect(resolveStartPoint({ ...room, room: '999' }, { ...context, findRoom })).toBeNull();
    expect(resolveStartPoint(room, context)).toBeNull();
  });

  it('resolves to nothing when the current location is unknown', () => {
    expect(
      resolveStartPoint({ kind: 'currentLocation' }, { ...context, userLocation: null })
    ).toBeNull();
  });

  it('resolves to nothing when the place no longer exists', () => {
    // A re-import can drop a building; a start point saved against it must not crash a screen.
    expect(resolveStartPoint({ kind: 'building', poiId: 'gone' }, context)).toBeNull();
    expect(resolveStartPoint({ kind: 'lot', lotId: 'gone' }, context)).toBeNull();
  });
});

describe('startPointOptions', () => {
  const options = startPointOptions(pois, lots);

  it('offers current location first, so it is the easy choice', () => {
    expect(options[0]).toEqual({
      key: 'current',
      label: 'Current Location',
      group: 'You',
      startPoint: { kind: 'currentLocation' },
    });
  });

  it('offers residence halls and apartments, per US-04', () => {
    const labels = options.map((option) => option.label);
    expect(labels).toContain('Arlington Hall');
    expect(labels).toContain('Timber Brook');
  });

  it('groups homes apart from parking', () => {
    const groupOf = (label: string) => options.find((o) => o.label === label)?.group;
    expect(groupOf('Arlington Hall')).toBe('Residence Halls');
    expect(groupOf('Timber Brook')).toBe('Apartments');
    expect(groupOf('Park North')).toBe('Parking');
  });

  it('lists a saved home right after current location, and nothing for an unknown one', () => {
    const withHome = startPointOptions(pois, lots, HALL.id);
    expect(withHome[1]).toEqual({
      key: 'home',
      label: 'Home: Arlington Hall',
      group: 'You',
      startPoint: { kind: 'building', poiId: HALL.id },
    });
    expect(startPointOptions(pois, lots, 'gone')).toEqual(options);
  });

  it('offers every other building after parking, so a walk can start from a classroom', () => {
    const nh = options.findIndex((option) => option.label === 'Nedderman Hall');
    expect(options[nh]).toMatchObject({ group: 'Academic Buildings', startPoint: { kind: 'building', poiId: CLASSROOM.id } });
    expect(nh).toBeGreaterThan(options.findIndex((option) => option.label === 'Park North'));
  });

  it('leaves out lots it cannot name, since the row would read blank', () => {
    expect(options.some((option) => option.label.trim() === '')).toBe(false);
    expect(options.some((option) => option.key === 'lot:lot-osm-123')).toBe(false);
  });

  it('sorts each group alphabetically so the list is scannable', () => {
    const homes = options.filter((o) => o.group === 'Residence Halls').map((o) => o.label);
    expect(homes).toEqual([...homes].sort());
  });
});

describe('filterStartPointOptions', () => {
  const options = startPointOptions(pois, lots, HALL.id);
  const labels = (query: string) => filterStartPointOptions(options, query).map((option) => option.label);

  it('returns everything for an empty or blank search', () => {
    expect(filterStartPointOptions(options, '')).toEqual(options);
    expect(filterStartPointOptions(options, '   ')).toEqual(options);
  });

  it('matches names case-insensitively, anywhere in the name', () => {
    expect(labels('nedder')).toContain('Nedderman Hall');
    expect(labels('BROOK')).toContain('Timber Brook');
    expect(labels('nedder')).not.toContain('Timber Brook');
  });

  it('matches a building by its abbreviation', () => {
    expect(labels('nh')).toContain('Nedderman Hall');
  });

  it('always keeps Current Location and Home at the top', () => {
    expect(labels('park').slice(0, 2)).toEqual(['Current Location', 'Home: Arlington Hall']);
    expect(labels('zzz')).toEqual(['Current Location', 'Home: Arlington Hall']);
  });
});
