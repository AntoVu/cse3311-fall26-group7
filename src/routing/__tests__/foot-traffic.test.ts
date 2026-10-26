import { TEST_EDGES, TEST_NODES } from '@/routing/__fixtures__/test-graph';
import { shortestPath } from '@/routing/dijkstra';
import {
  activeCrowdZones,
  crowdCost,
  crowdNote,
  crowdedEdgeIds,
  zonesOnRoute,
  type CrowdZone,
} from '@/routing/foot-traffic';
import { buildGraph } from '@/routing/graph';
import type { MapNode } from '@/types/map';

// Around node D of the test graph, weekdays 11:00-13:30.
const ZONE: CrowdZone = {
  id: 'busy-d',
  name: 'Busy D',
  poiId: 'poi-d',
  radiusMeters: 30,
  peaks: [{ days: [1, 2, 3, 4, 5], startMinute: 11 * 60, endMinute: 13 * 60 + 30 }],
};
const centerOf = (poiId: string) => (poiId === 'poi-d' ? { lat: 32.7309, lng: -97.1112 } : undefined);

// 2026-10-26 is a Monday.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, 26 + day, hour, minute);

describe('activeCrowdZones', () => {
  it('is busy inside a peak on a listed day', () => {
    expect(activeCrowdZones([ZONE], at(0, 12))).toEqual([ZONE]);
    expect(activeCrowdZones([ZONE], at(4, 11))).toEqual([ZONE]); // Friday, the first minute
  });

  it('is quiet outside the peak, at its end, and on weekends', () => {
    expect(activeCrowdZones([ZONE], at(0, 10, 59))).toEqual([]);
    expect(activeCrowdZones([ZONE], at(0, 13, 30))).toEqual([]);
    expect(activeCrowdZones([ZONE], at(5, 12))).toEqual([]); // Saturday
  });
});

describe('crowdedEdgeIds', () => {
  const graph = buildGraph(TEST_NODES, TEST_EDGES);

  it('takes every edge with a point inside the zone', () => {
    expect([...crowdedEdgeIds(graph, [ZONE], centerOf)].sort()).toEqual(['AD', 'DC']);
  });

  it('skips a zone whose building is not on the map', () => {
    expect(crowdedEdgeIds(graph, [{ ...ZONE, poiId: 'gone' }], centerOf).size).toBe(0);
  });

  it('leaves indoor edges alone: the zones are outdoors', () => {
    const indoor = TEST_NODES.map((node): MapNode => (node.id === 'D' ? { ...node, level: '1' } : node));
    expect(crowdedEdgeIds(buildGraph(indoor, TEST_EDGES), [ZONE], centerOf).size).toBe(0);
  });
});

describe('crowdCost', () => {
  const graph = buildGraph(TEST_NODES, TEST_EDGES);

  it('detours around a crowd when the way round costs less', () => {
    const crowded = crowdedEdgeIds(graph, [ZONE], centerOf);
    const result = shortestPath(graph, 'A', 'C', { edgeCost: crowdCost(crowded) });
    expect(result?.nodeIds).toEqual(['A', 'B', 'C']);
    expect(result?.totalDistanceMeters).toBe(200);
  });

  it('still walks through when there is no other way', () => {
    const crowded = crowdedEdgeIds(graph, [ZONE], centerOf);
    expect(shortestPath(graph, 'A', 'D', { edgeCost: crowdCost(crowded) })?.nodeIds).toEqual(['A', 'D']);
  });
});

describe('zonesOnRoute', () => {
  it('names the zones a route walks through', () => {
    const graph = buildGraph(TEST_NODES, TEST_EDGES);
    const crowded = crowdedEdgeIds(graph, [ZONE], centerOf);
    expect(zonesOnRoute(['AD', 'DC'], [ZONE], graph, centerOf)).toEqual([ZONE]);
    expect(zonesOnRoute(['AB', 'BC'], [ZONE], graph, centerOf)).toEqual([]);
    expect(crowded.has('AB')).toBe(false);
  });
});

describe('crowdNote', () => {
  const none = { busy: [], through: [], avoided: [], extraMeters: 0 };
  const other = { ...ZONE, id: 'other', name: 'the Other Place' };

  it('says when nothing is busy', () => {
    expect(crowdNote(true, none, 'walking')).toBe('No busy areas right now.');
  });

  it('names what it goes around and the time it adds', () => {
    const report = { busy: [ZONE, other], through: [], avoided: [ZONE], extraMeters: 84 };
    expect(crowdNote(true, report, 'walking')).toBe('Going around Busy D (busy now), +1 min.');
  });

  it('warns when the walk still crosses a busy place', () => {
    const report = { busy: [ZONE], through: [ZONE], avoided: [], extraMeters: 0 };
    expect(crowdNote(false, report, 'walking')).toBe('Passes Busy D, busy now.');
    expect(crowdNote(true, report, 'walking')).toBe('No way around Busy D, busy now.');
  });

  it('says the walk is clear when busy places are elsewhere', () => {
    const report = { busy: [ZONE, other], through: [], avoided: [], extraMeters: 0 };
    expect(crowdNote(false, report, 'walking')).toBe('Busy now: Busy D and the Other Place. This walk stays clear.');
  });
});
