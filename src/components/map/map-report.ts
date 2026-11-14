import { insideRing } from '@/routing/geo';
import type { Coordinate } from '@/types/map';

/**
 * "Report a problem" with the map: the user picks what's wrong and taps where. The app sends it to
 * the report Worker (tools/report-worker), which files it as an issue in a private repo, so no
 * account is needed and reports aren't public. Until the Worker's URL is set below, the app falls
 * back to a prefilled GitHub issue on this repo, which the reporter submits themselves.
 */
export const REPORT_REPO_URL = 'https://github.com/AntoVu/cse3311-fall26-group7';
/** The deployed report Worker's URL; '' falls back to a GitHub issue (see tools/report-worker/README.md). */
export const REPORT_ENDPOINT = 'https://mavigator-reports.mavigator.workers.dev';

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

/** The issue a report becomes. The note goes in a code block, so it can't @mention anyone or add links. */
export function reportIssue(report: MapReport): { title: string; body: string } {
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
    note.trim() ? codeBlock(note.trim()) : '(none given)',
    '',
    "_Sent from Mavigator's Report a problem form._",
  ]
    .filter((line) => line !== undefined)
    .join('\n');
  return { title, body };
}

/** A fence longer than any run of backticks in the text, so the text can't close it early. */
function codeBlock(text: string): string {
  const fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((run) => run[0].length + 1)));
  return `${fence}text\n${text}\n${fence}`;
}

/** The GitHub "new issue" page, with the title, body and label filled in (the fallback when there is no Worker). */
export function reportIssueUrl(report: MapReport): string {
  const { title, body } = reportIssue(report);
  const query = { title, body, labels: 'map-report' };
  return `${REPORT_REPO_URL}/issues/new?${Object.entries(query)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

/** Sends a report to the Worker; true when it was filed. */
export async function sendReport(report: MapReport, endpoint: string = REPORT_ENDPOINT): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** The numbered room whose walls contain `point`, if any. */
export function roomAt(rooms: { room?: string; ring: Coordinate[] }[], point: Coordinate): string | undefined {
  return rooms.find((r) => r.room && insideRing(r.ring, point))?.room;
}
