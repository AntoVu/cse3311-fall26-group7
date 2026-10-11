import {
    getDistance,
    getEstimatedWalkTime,
} from '@/constants/parking-recommendation';

describe('parking recommendation', () => {
  it('returns zero distance for the same coordinate', () => {
    const coordinate = {
      lat: 32.729,
      lng: -97.115,
    };

    expect(getDistance(coordinate, coordinate)).toBeCloseTo(0);
  });

  it('estimates a 5 minute walk for 0.25 miles', () => {
    expect(getEstimatedWalkTime(0.25)).toBe(5);
  });
});