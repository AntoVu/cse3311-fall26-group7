import { formatDistance } from '@/routing/format';

describe('formatDistance', () => {
  it('formats metric distances as meters below 400 meters and kilometers otherwise', () => {
    expect(formatDistance(180, 'metric')).toBe('180 m');
    expect(formatDistance(399.6, 'metric')).toBe('400 m');
    expect(formatDistance(400, 'metric')).toBe('0.4 km');
    expect(formatDistance(1250, 'metric')).toBe('1.3 km');
  });

  it('formats imperial distances in miles', () => {
    expect(formatDistance(0, 'imperial')).toBe('0.0 miles');
    expect(formatDistance(1609.344, 'imperial')).toBe('1.0 mile');
    expect(formatDistance(643.7376, 'imperial')).toBe('0.4 miles');
  });
});
