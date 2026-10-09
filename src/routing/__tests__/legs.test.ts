import { INDOOR_POI_ID, INDOOR_TEST_EDGES, INDOOR_TEST_NODES, at } from '@/routing/__fixtures__/indoor-graph';
import { etaMinutes } from '@/routing/eta';
import { buildGraph } from '@/routing/graph';
import { entranceSide, legTimes, splitRoute } from '@/routing/legs';
import { findRoute } from '@/routing/route';

const graph = buildGraph(INDOOR_TEST_NODES, INDOOR_TEST_EDGES);
const node = (id: string) => graph.nodeById.get(id)!;

describe('splitRoute', () => {
  const route = findRoute(graph, at(0, -100), node('D205').coordinate, { toNodeId: 'D205' })!;
  const legs = splitRoute(route, graph, INDOOR_POI_ID);

  it('cuts the route at the door where it enters the building', () => {
    expect(legs.entrance?.id).toBe('H1a');
    expect(legs.outdoor!.path[legs.outdoor!.path.length - 1]).toEqual(node('H1a').coordinate);
    expect(legs.indoor!.path[0]).toEqual(node('H1a').coordinate);
    expect(legs.indoor!.pathNodes[0]?.id).toBe('H1a');
    // The outdoor leg stops at the door instead of walking in.
    expect(legs.outdoor!.pathNodes[legs.outdoor!.pathNodes.length - 1]).toBeUndefined();
    expect(legs.indoor!.path[legs.indoor!.path.length - 1]).toEqual(node('D205').coordinate);
  });

  it('measures each leg, stairs included, and the two add up to the whole', () => {
    expect(legs.outdoor!.meters).toBeCloseTo(110, 0);
    // 30 + 10 + 2 along floor 1, the stairs' 20, then 2 + 30 + 8 upstairs.
    expect(legs.indoor!.meters).toBeCloseTo(102, 0);
    expect(legs.outdoor!.meters + legs.indoor!.meters).toBeCloseTo(route.totalDistanceMeters, 6);
  });

  it('has no outdoor leg when the route starts inside the building', () => {
    const inside = findRoute(graph, node('D105').coordinate, node('D205').coordinate, {
      fromNodeId: 'D105',
      toNodeId: 'D205',
    })!;
    const split = splitRoute(inside, graph, INDOOR_POI_ID);
    expect(split.outdoor).toBeNull();
    expect(split.indoor!.meters).toBeCloseTo(inside.totalDistanceMeters, 6);
    expect(split.entrance).toBeUndefined();
  });

  it('has no indoor leg when the route ends outside the building', () => {
    const outside = findRoute(graph, at(0, -100), at(0, 0))!;
    const split = splitRoute(outside, graph, INDOOR_POI_ID);
    expect(split.indoor).toBeNull();
    expect(split.outdoor!.meters).toBeCloseTo(outside.totalDistanceMeters, 6);
  });
});

describe('entranceSide', () => {
  it('names the side of the building a door is on', () => {
    const center = at(0, 40);
    expect(entranceSide(at(0, 10), center)).toBe('west');
    expect(entranceSide(at(20, 40), center)).toBe('north');
    expect(entranceSide(at(0, 70), center)).toBe('east');
    expect(entranceSide(at(-20, 45), center)).toBe('south');
  });
});

describe('legTimes', () => {
  it('bikes only the outdoor leg; inside is always walking pace', () => {
    const legs = { outdoor: { meters: 960 }, indoor: { meters: 84 } };
    const biking = legTimes(legs, 'biking');
    expect(biking.outdoorMinutes).toBeCloseTo(etaMinutes(960, 'biking'));
    expect(biking.indoorMinutes).toBeCloseTo(etaMinutes(84, 'walking'));
    expect(biking.totalMinutes).toBeCloseTo(biking.outdoorMinutes + biking.indoorMinutes);
    expect(legTimes({ outdoor: null, indoor: { meters: 84 } }, 'biking').outdoorMinutes).toBe(0);
  });
});
