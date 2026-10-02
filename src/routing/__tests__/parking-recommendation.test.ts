import { PARKING_LOT_IDS } from '@/constants/parking-permits';
import { campusGraph } from '@/routing/campus-graph';
import { recommendLots } from '@/routing/parking-recommendation';
import { CAMPUS_LOTS } from '@/data/campus-lots';

const NEDDERMAN = { lat: 32.7324766, lng: -97.1138654 };

// Monday 2026-09-21. Permit rules differ across these, which is the point.
const WEEKDAY_MORNING = new Date(2026, 8, 21, 9, 0);
const WEEKDAY_EVENING = new Date(2026, 8, 21, 20, 0);

const recommend = (permit: Parameters<typeof recommendLots>[0]['permit'], arrivalTime: Date, limit?: number) =>
  recommendLots({
    permit,
    destination: NEDDERMAN,
    arrivalTime,
    graph: campusGraph,
    lots: CAMPUS_LOTS,
    limit,
  });

describe('recommendLots', () => {
  it('recommends nothing without a permit, rather than guessing', () => {
    expect(recommend(null, WEEKDAY_MORNING)).toEqual([]);
  });

  it('only offers lots the permit may actually use at that hour', () => {
    // East Commuter is held to its own zone (plus reduced-rate and remote lots) on a weekday
    // morning, so a south lot is out. Listed from the rules rather than from whichever lots
    // happen to be identified on the map so far.
    const L = PARKING_LOT_IDS;
    const eastMorning: string[] = [
      L.lot36, L.parkNorth, L.parkCentral, L.parkSouth, L.lotGR, L.lot29, L.lot25, L.lot26, L.lot27,
    ];
    const morning = recommend('East Commuter', WEEKDAY_MORNING);
    expect(morning.length).toBeGreaterThan(0);
    for (const option of morning) {
      expect(eastMorning).toContain(option.lot.id);
    }
  });

  it('opens up after hours, when every lot is fair game', () => {
    // Uncapped: both hours have more choices than the default limit of five.
    const evening = recommend('East Commuter', WEEKDAY_EVENING, Infinity);
    const morning = recommend('East Commuter', WEEKDAY_MORNING, Infinity);
    expect(evening.length).toBeGreaterThan(morning.length);
  });

  it('puts the shortest walk first', () => {
    const options = recommend('Preferred Garage', WEEKDAY_EVENING);
    expect(options.length).toBeGreaterThan(1);
    const walks = options.map((option) => option.walkMeters);
    expect(walks).toEqual([...walks].sort((a, b) => a - b));
  });

  it('reports a walk and an ETA that agree with each other', () => {
    const [best] = recommend('Preferred Garage', WEEKDAY_EVENING);
    expect(best.walkMeters).toBeGreaterThan(0);
    expect(best.walkMinutes).toBeGreaterThan(0);
    // 1.4 m/s: a 15-minute walk is roughly 1.3 km, so anything wilder is a unit slip.
    expect(best.walkMeters / best.walkMinutes).toBeCloseTo(1.4 * 60, 0);
  });

  it('never offers a lot it has no permit rule for', () => {
    const unidentified = CAMPUS_LOTS.filter((lot) => lot.id.startsWith('lot-osm-')).map((l) => l.id);
    for (const option of recommend('Preferred Garage', WEEKDAY_EVENING)) {
      expect(unidentified).not.toContain(option.lot.id);
    }
  });

  it('keeps the list short enough to act on', () => {
    expect(recommend('Preferred Garage', WEEKDAY_EVENING).length).toBeLessThanOrEqual(5);
    expect(
      recommendLots({
        permit: 'Preferred Garage',
        destination: NEDDERMAN,
        arrivalTime: WEEKDAY_EVENING,
        graph: campusGraph,
        lots: CAMPUS_LOTS,
        limit: 2,
      }).length
    ).toBeLessThanOrEqual(2);
  });

  it('recommends the Maverick Garage to a Preferred Garage permit', () => {
    const ids = recommend('Preferred Garage', WEEKDAY_MORNING).map((option) => option.lot.id);
    expect(ids).toContain(PARKING_LOT_IDS.maverickGarage);
  });
});
