import type { Coordinate } from '@/types/map';

/**
 * "Report a problem" with the map: the user picks what's wrong and taps where, and the report
 * becomes a prefilled GitHub issue for the maintainers. The site has no server, so nothing is
 * sent from the app itself; the person reporting submits the issue (a GitHub account is needed).
 */
export const REPORT_REPO_URL = 'https://github.com/AntoVu/cse3311-fall26-group7';

export const REPORT_KINDS = [
  { id: 'wrong-room', label: 'Wrong room number' },
  { id: 'missing-room', label: 'Missing room' },
  { id: 'missing-object', label: 'Missing object' },
  { id: 'wrong-object', label: 'Wrong object' },
  { id: 'route', label: 'Route problem' },
  { id: 'other', label: 'Something else' },
] as const;

export type ReportKind = (typeof REPORT_KINDS)[number]['id'];

export type MapReport = {
  kind: ReportKind;
  building: { id: string; name: string; abbreviation?: string };
  floor?: string;
  /** The numbered room the marked spot is in. */
  room?: string;
  /** The spot tapped on the floor plan. */
  at?: Coordinate;
  note: string;
};

const kindLabel = (kind: ReportKind) => REPORT_KINDS.find((k) => k.id === kind)!.label;

/** The GitHub "new issue" page, with the title, body and label filled in. */
export function reportIssueUrl(report: MapReport): string {
  const { building, floor, room, at, note } = report;
  const place = [building.abbreviation ?? building.name, floor && `floor ${floor}`, room && `room ${room}`]
    .filter(Boolean)
    .join(', ');
  const title = `Map report: ${kindLabel(report.kind)} (${place})`;
  const body = [
    `**Problem:** ${kindLabel(report.kind)}`,
    `**Building:** ${building.name}${building.abbreviation ? ` (${building.abbreviation})` : ''}, \`${building.id}\``,
    floor && `**Floor:** ${floor}`,
    room && `**Room:** ${room}`,
    at && `**Marked at:** ${at.lat.toFixed(6)}, ${at.lng.toFixed(6)}`,
    '',
    '**Details:**',
    note.trim() || '(none given)',
    '',
    "_Sent from Mavigator's Report a problem form._",
  ]
    .filter((line) => line !== undefined)
    .join('\n');
  const query = { title, body, labels: 'map-report' };
  return `${REPORT_REPO_URL}/issues/new?${Object.entries(query)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

/** The numbered room whose walls contain `point`, if any (ray casting; lat/lng is flat enough at building scale). */
export function roomAt(rooms: { room?: string; ring: Coordinate[] }[], point: Coordinate): string | undefined {
  const inside = (ring: Coordinate[]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if (a.lat > point.lat !== b.lat > point.lat && point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng) {
        hit = !hit;
      }
    }
    return hit;
  };
  return rooms.find((r) => r.room && inside(r.ring))?.room;
}
