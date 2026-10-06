import { INDOOR_POI_ID, INDOOR_TEST_EDGES, INDOOR_TEST_NODES } from '@/routing/__fixtures__/indoor-graph';
import { buildingLevels, floorRank, routeOnFloor } from '@/routing/floors';
import { buildGraph } from '@/routing/graph';
import { findRoute } from '@/routing/route';

const graph = buildGraph(INDOOR_TEST_NODES, INDOOR_TEST_EDGES);

describe('floorRank', () => {
  it('puts the basement below the ground floor', () => {
    expect(['3', 'B', '1', '2'].sort((a, b) => floorRank(a) - floorRank(b))).toEqual(['B', '1', '2', '3']);
  });
});

describe('buildingLevels', () => {
  it("lists a building's floors bottom to top", () => {
    expect(buildingLevels(INDOOR_TEST_NODES, INDOOR_POI_ID)).toEqual(['1', '2']);
  });

  it('is empty for a building with no indoor map', () => {
    expect(buildingLevels(INDOOR_TEST_NODES, 'academic-unmapped')).toEqual([]);
  });
});

describe('routeOnFloor', () => {
  const route = findRoute(graph, graph.nodeById.get('O1')!.coordinate, graph.nodeById.get('D205')!.coordinate, {
    toNodeId: 'D205',
  })!;
  const coordinateOf = (id: string) => graph.nodeById.get(id)!.coordinate;

  it('keeps the outdoor walk and the chosen floor, and drops the other floors', () => {
    const pieces = routeOnFloor(route.path, route.pathNodes, INDOOR_POI_ID, '2');
    expect(pieces).toEqual([
      [coordinateOf('O1'), coordinateOf('O2')],
      [coordinateOf('S2'), coordinateOf('H2a'), coordinateOf('H2c'), coordinateOf('D205')],
    ]);
  });

  it('shows floor 1 joined to the outdoor walk at the entrance', () => {
    const pieces = routeOnFloor(route.path, route.pathNodes, INDOOR_POI_ID, '1');
    expect(pieces).toEqual([
      [coordinateOf('O1'), coordinateOf('O2'), coordinateOf('H1a'), coordinateOf('H1c'), coordinateOf('H1b'), coordinateOf('S1')],
    ]);
  });
});
