import { INDOOR_POI_ID, INDOOR_TEST_EDGES, INDOOR_TEST_NODES } from '@/routing/__fixtures__/indoor-graph';
import { buildGraph } from '@/routing/graph';
import { findRoomNode, hasIndoorMap } from '@/routing/rooms';

const graph = buildGraph(
  [...INDOOR_TEST_NODES, { id: 'X', coordinate: { lat: 0, lng: 0 }, poiId: 'other', level: '1', room: '105' }],
  INDOOR_TEST_EDGES
);

describe('findRoomNode', () => {
  it("finds a room's door in the right building", () => {
    expect(findRoomNode(graph, INDOOR_POI_ID, '205')?.id).toBe('D205');
    expect(findRoomNode(graph, INDOOR_POI_ID, '105')?.id).toBe('D105');
  });

  it('ignores case and spaces, since room numbers are typed by hand', () => {
    expect(findRoomNode(graph, INDOOR_POI_ID, ' 2 05 ')?.id).toBe('D205');
  });

  it('returns null for a room that is not mapped', () => {
    expect(findRoomNode(graph, INDOOR_POI_ID, '999')).toBeNull();
    expect(findRoomNode(graph, 'academic-unmapped', '205')).toBeNull();
    expect(findRoomNode(graph, INDOOR_POI_ID, '')).toBeNull();
  });
});

describe('hasIndoorMap', () => {
  it('is true only for a building with indoor nodes', () => {
    expect(hasIndoorMap(graph, INDOOR_POI_ID)).toBe(true);
    expect(hasIndoorMap(graph, 'academic-unmapped')).toBe(false);
  });
});
