import {
  dateToTime,
  formatTime,
  parseTime,
  TIME_STEP_MINUTES,
  timeToDate,
} from '@/components/settings/time-format';

describe('time format', () => {
  it('snaps to 5-minute steps', () => {
    expect(TIME_STEP_MINUTES).toBe(5);
  });

  it('formats morning, noon, afternoon and midnight on a 12-hour clock', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(10 * 60 + 5)).toBe('10:05 AM');
    expect(formatTime(12 * 60)).toBe('12:00 PM');
    expect(formatTime(13 * 60 + 50)).toBe('1:50 PM');
    expect(formatTime(23 * 60 + 55)).toBe('11:55 PM');
  });

  it('parses what it formats, for every 5-minute time of day', () => {
    for (let minutes = 0; minutes < 24 * 60; minutes += TIME_STEP_MINUTES) {
      expect(parseTime(formatTime(minutes))).toBe(minutes);
    }
  });

  it('rejects text that is not a 12-hour time', () => {
    expect(parseTime('')).toBeNull();
    expect(parseTime('14:30')).toBeNull();
    expect(parseTime('10:75 AM')).toBeNull();
    expect(parseTime('soon')).toBeNull();
  });

  it('round-trips through a Date and falls back when the text is empty', () => {
    expect(dateToTime(timeToDate('2:35 PM', '8:00 AM'))).toBe('2:35 PM');
    expect(dateToTime(timeToDate('', '9:15 AM'))).toBe('9:15 AM');
    expect(dateToTime(timeToDate('', ''))).toBe('8:00 AM');
  });
});
