import { BIKING_METERS_PER_SECOND, etaMinutes, WALKING_METERS_PER_SECOND } from '@/routing/eta';

describe('etaMinutes', () => {
  it('takes no time to go nowhere', () => {
    expect(etaMinutes(0)).toBe(0);
  });

  it('walks a kilometer in about 12 minutes', () => {
    expect(etaMinutes(1000)).toBeCloseTo(1000 / WALKING_METERS_PER_SECOND / 60, 5);
    expect(etaMinutes(1000)).toBeGreaterThan(10);
    expect(etaMinutes(1000)).toBeLessThan(14);
  });

  it('crosses campus on foot in a believable few minutes', () => {
    // Nedderman Hall to the library is roughly 400 m along the paths.
    expect(etaMinutes(400)).toBeGreaterThan(3);
    expect(etaMinutes(400)).toBeLessThan(7);
  });

  it('bikes the same distance faster than it walks it', () => {
    expect(etaMinutes(1000, 'biking')).toBeLessThan(etaMinutes(1000, 'walking'));
    expect(BIKING_METERS_PER_SECOND).toBeGreaterThan(WALKING_METERS_PER_SECOND);
  });

  it('scales with distance', () => {
    expect(etaMinutes(2000)).toBeCloseTo(etaMinutes(1000) * 2, 5);
  });
});
