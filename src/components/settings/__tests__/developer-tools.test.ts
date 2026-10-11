import { buildingRooms, testClassTimes } from '@/components/settings/developer-tools';
import { INDOOR_POI_ID, INDOOR_TEST_NODES } from '@/routing/__fixtures__/indoor-graph';
import type { MapNode } from '@/types/map';

const at = (hours: number, minutes: number) => new Date(2026, 9, 9, hours, minutes);

describe('testClassTimes', () => {
  it('starts 30 minutes from now and ends 90 minutes from now', () => {
    expect(testClassTimes(at(14, 0))).toEqual({ startTime: '2:30 PM', endTime: '3:30 PM' });
    expect(testClassTimes(at(11, 45))).toEqual({ startTime: '12:15 PM', endTime: '1:15 PM' });
  });

  it('never runs past midnight, and still starts before it ends', () => {
    expect(testClassTimes(at(23, 0))).toEqual({ startTime: '11:30 PM', endTime: '11:59 PM' });
    expect(testClassTimes(at(23, 50))).toEqual({ startTime: '11:58 PM', endTime: '11:59 PM' });
  });
});

describe('buildingRooms', () => {
  it("lists a building's rooms by floor, bottom up", () => {
    expect(buildingRooms(INDOOR_TEST_NODES, INDOOR_POI_ID)).toEqual([
      { level: '1', rooms: ['105', '105A'] },
      { level: '2', rooms: ['205'] },
    ]);
  });

  it('lists a room once even with several doors, sorted as numbers, basement first', () => {
    const node = (id: string, level: string, room: string): MapNode => ({
      id,
      coordinate: { lat: 0, lng: 0 },
      poiId: 'p',
      level,
      room,
    });
    const nodes = [
      node('a', '1', '110'),
      node('b', '1', '19'),
      node('c', '1', '110'),
      node('d', 'B', 'B03'),
      { id: 'hall', coordinate: { lat: 0, lng: 0 }, poiId: 'p', level: '1' },
    ];
    expect(buildingRooms(nodes, 'p')).toEqual([
      { level: 'B', rooms: ['B03'] },
      { level: '1', rooms: ['19', '110'] },
    ]);
  });

  it('is empty for a building with no indoor map', () => {
    expect(buildingRooms(INDOOR_TEST_NODES, 'academic-somewhere-else')).toEqual([]);
  });
});
