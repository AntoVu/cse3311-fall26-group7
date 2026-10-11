import { formatDistance, formatDuration } from '@/routing/format';

describe('formatDistance', () => {
  it('uses feet for a short walk, rounded to something readable', () => {
    expect(formatDistance(100)).toBe('330 ft');
    expect(formatDistance(30)).toBe('100 ft');
  });

  it('switches to miles once feet stop being easy to judge', () => {
    expect(formatDistance(500)).toBe('0.3 mi');
    expect(formatDistance(1609)).toBe('1.0 mi');
  });

  it('crosses over at a quarter mile', () => {
    expect(formatDistance(401)).toContain('ft');
    expect(formatDistance(403)).toContain('mi');
  });

  it('handles no distance at all', () => {
    expect(formatDistance(0)).toBe('0 ft');
  });

  it('formats metric distances as meters below a kilometer and kilometers otherwise', () => {
    expect(formatDistance(180, 'metric')).toBe('180 m');
    expect(formatDistance(850, 'metric')).toBe('850 m');
    expect(formatDistance(999.4, 'metric')).toBe('999 m');
    expect(formatDistance(1000, 'metric')).toBe('1.0 km');
    expect(formatDistance(1250, 'metric')).toBe('1.3 km');
  });
});

describe('formatDuration', () => {
  it('rounds to whole minutes', () => {
    expect(formatDuration(5.4)).toBe('5 min');
    expect(formatDuration(5.6)).toBe('6 min');
  });

  // "0 min" reads as though you have arrived, which is worse than rounding up.
  it('never says zero minutes', () => {
    expect(formatDuration(0)).toBe('1 min');
    expect(formatDuration(0.2)).toBe('1 min');
  });

  it('breaks an hour out once there is one', () => {
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(75)).toBe('1 hr 15 min');
    expect(formatDuration(125)).toBe('2 hr 5 min');
  });
});
