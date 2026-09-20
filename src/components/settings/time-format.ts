// Some UTA classes start on 5-minute marks, so the time pickers snap to this.
export const TIME_STEP_MINUTES = 5;

// 615 -> "10:15 AM" (12-hour clock).
export function formatTime(minutesSinceMidnight: number): string {
  const hours24 = Math.floor(minutesSinceMidnight / 60);
  const minutes = minutesSinceMidnight % 60;
  const period = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

// "10:15 AM" -> 615, or null if the text isn't in that format.
export function parseTime(text: string): number | null {
  const match = /^(1[0-2]|0?[1-9]):([0-5]\d) (AM|PM)$/.exec(text.trim());
  if (!match) return null;

  const hours12 = Number(match[1]) % 12;
  const minutes = Number(match[2]);

  return (match[3] === 'PM' ? hours12 + 12 : hours12) * 60 + minutes;
}

export function timeToDate(text: string, fallbackText: string): Date {
  const minutes = parseTime(text) ?? parseTime(fallbackText) ?? 8 * 60;
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

export function dateToTime(date: Date): string {
  return formatTime(date.getHours() * 60 + date.getMinutes());
}
