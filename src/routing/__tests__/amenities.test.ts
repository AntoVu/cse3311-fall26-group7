import { at, INDOOR_TEST_EDGES, INDOOR_TEST_NODES } from '@/routing/__fixtures__/indoor-graph';
import { availableAmenities, buildingsWith, closestBuildingsWith, hasAmenity, matchAmenities, nearestAmenity } from '@/routing/amenities';
import { findBuilding } from '@/data/buildings';
import { buildGraph } from '@/routing/graph';
import type { MapNode } from '@/types/map';

// The fixture building with vending behind door 105 (floor 1) and in room 205 (floor 2), and a
// women's restroom tagged on room 205's door too.
const tag = (node: MapNode): MapNode =>
  node.id === 'D105' ? { ...node, amenities: ['vending'] } : node.id === 'D205' ? { ...node, amenities: ['vending', 'water-refill'], restroom: 'women' } : node;
const graph = buildGraph(INDOOR_TEST_NODES.map(tag), INDOOR_TEST_EDGES);
const OUTSIDE = at(0, -100);

describe('hasAmenity', () => {
  it('matches an item kind, any water kind, and a restroom node', () => {
    const d205 = graph.nodeById.get('D205')!;
    expect(hasAmenity(d205, 'vending')).toBe(true);
    expect(hasAmenity(d205, 'water')).toBe(true);
    expect(hasAmenity(d205, 'restroom')).toBe(true);
    expect(hasAmenity(d205, 'microwave')).toBe(false);
  });
});

describe('nearestAmenity', () => {
  it('goes to the nearest of several by walking distance', () => {
    expect(nearestAmenity(graph, OUTSIDE, 'vending')?.id).toBe('D105');
  });

  it('finds the only one, upstairs', () => {
    expect(nearestAmenity(graph, OUTSIDE, 'restroom')?.id).toBe('D205');
  });

  it('returns null when there is none', () => {
    expect(nearestAmenity(graph, OUTSIDE, 'microwave')).toBeNull();
  });
});

describe('the building index', () => {
  const index = {
    a: { amenities: ['restroom', 'vending'] },
    b: { amenities: ['water-refill'] },
    c: {},
  };

  it('lists the buildings that have one', () => {
    expect(buildingsWith('vending', index)).toEqual(['a']);
    expect(buildingsWith('water', index)).toEqual(['b']);
    expect(buildingsWith('restroom', index)).toEqual(['a']);
  });

  it('offers only what some building has, in order', () => {
    expect(availableAmenities(index).map((a) => a.id)).toEqual(['restroom', 'vending', 'water']);
  });

  it('shortlists the closest buildings that have one, nearest first', () => {
    const nh = findBuilding('academic-nedderman-hall')!.coordinate;
    const near = closestBuildingsWith('restroom', nh, 3);
    // Nedderman has restrooms, so it is its own closest; every pick has one.
    expect(near[0]).toBe('academic-nedderman-hall');
    expect(near).toHaveLength(3);
    expect(near.every((id) => buildingsWith('restroom').includes(id))).toBe(true);
  });

  it('knows the real data has vending machines and restrooms', () => {
    expect(availableAmenities().map((a) => a.id)).toEqual(expect.arrayContaining(['restroom', 'vending']));
  });
});

describe('matchAmenities', () => {
  const ids = (query: string) => matchAmenities(query).map((a) => a.id);

  it('knows the start of a word, and other words for it', () => {
    expect(ids('vend')).toEqual(['vending']);
    expect(ids('Bathroom')).toEqual(['restroom']);
    expect(ids('water fountain')).toEqual(['water']);
    expect(ids('ATM')).toEqual(['atm']);
  });

  it('ignores one letter and building names', () => {
    expect(ids('a')).toEqual([]);
    expect(ids('nedderman')).toEqual([]);
    expect(ids('NH 340')).toEqual([]);
  });
});
