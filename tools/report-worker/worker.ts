import { REPORT_KINDS, reportIssue, type MapReport } from '../../src/components/map/map-report.ts';

/**
 * The report Worker (Cloudflare Workers): takes a "Report a problem" from the app and files it as
 * an issue in a private GitHub repo. Setup and deploy: README.md beside this file.
 *
 * Security, in short:
 * - It can only create issues. There is no way to read, list or change reports through it.
 * - The GitHub token is a Worker secret, never sent to the app, and can only touch the reports repo.
 * - Every field is checked against a fixed shape; anything else is rejected, and the issue text is
 *   built here, not taken from the request. The note sits in a code block (no @mentions or links).
 * - Nothing is stored or logged. The client's IP is used only as a rate-limit key in memory.
 * - Rate limits per IP and overall, a size cap, and an allowed-origins list (which only stops other
 *   websites; scripts can fake an Origin, which is what the rate limits are for).
 */

type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

export type Env = {
  /** Fine-grained token: the reports repo only, Issues read and write. Set with `wrangler secret put`. */
  GITHUB_TOKEN: string;
  /** "owner/repo" of the private reports repo. */
  GITHUB_REPO: string;
  /** Comma-separated origins allowed to send reports (the site, and localhost for development). */
  ALLOWED_ORIGINS: string;
  PER_IP?: RateLimiter;
  ALL?: RateLimiter;
};

const MAX_BODY_BYTES = 4000;
const MAX_NOTE = 1000;
/** A box well around campus, so a marked spot can't be anywhere in the world. */
const AREA = { minLat: 32.6, maxLat: 32.85, minLng: -97.25, maxLng: -97.0 };

const text = (value: unknown, pattern: RegExp) => (typeof value === 'string' && pattern.test(value) ? value : undefined);

/** The report, if every field has the expected shape; null otherwise. Unknown fields are dropped. */
export function parseReport(input: unknown): MapReport | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const building = (raw.building ?? {}) as Record<string, unknown>;

  const kind = REPORT_KINDS.find((k) => k.id === raw.kind)?.id;
  const id = text(building.id, /^[a-z0-9-]{1,80}$/);
  const name = text(building.name, /^[\p{L}\p{N} .,'&()/+-]{1,100}$/u);
  const abbreviation = building.abbreviation === undefined ? undefined : text(building.abbreviation, /^[A-Za-z0-9 &.-]{1,12}$/);
  const floor = raw.floor === undefined ? undefined : text(raw.floor, /^[A-Za-z0-9]{1,4}$/);
  const room = raw.room === undefined ? undefined : text(raw.room, /^[A-Za-z0-9._-]{1,12}$/);
  const note = typeof raw.note === 'string' && raw.note.length <= MAX_NOTE ? raw.note : undefined;
  if (!kind || !id || !name || note === undefined) return null;
  if (building.abbreviation !== undefined && !abbreviation) return null;
  if ((raw.floor !== undefined && !floor) || (raw.room !== undefined && !room)) return null;

  let at: MapReport['at'];
  if (raw.at !== undefined) {
    const { lat, lng } = (raw.at ?? {}) as Record<string, unknown>;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    if (!(lat >= AREA.minLat && lat <= AREA.maxLat && lng >= AREA.minLng && lng <= AREA.maxLng)) return null;
    at = { lat, lng };
  }

  return {
    kind,
    building: { id, name, ...(abbreviation && { abbreviation }) },
    ...(floor && { floor }),
    ...(room && { room }),
    ...(at && { at }),
    // Control characters other than newlines and tabs are dropped.
    // eslint-disable-next-line no-control-regex
    note: note.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ''),
  };
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  if (!allowed.includes(origin)) return new Response('Forbidden', { status: 403 });

  const cors = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
  const reply = (status: number, ok: boolean) =>
    new Response(JSON.stringify({ ok }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  if (request.method !== 'POST') return reply(405, false);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return reply(415, false);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const underLimit = async (limiter: RateLimiter | undefined, key: string) => !limiter || (await limiter.limit({ key })).success;
  if (!(await underLimit(env.PER_IP, ip)) || !(await underLimit(env.ALL, 'all'))) return reply(429, false);

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return reply(413, false);
  let report: MapReport | null;
  try {
    report = parseReport(JSON.parse(body));
  } catch {
    report = null;
  }
  if (!report) return reply(400, false);

  const github = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'mavigator-report-worker',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reportIssue(report)),
  });
  // Only the status is logged, never the report or the IP.
  if (!github.ok) console.error('GitHub issue not created:', github.status);
  return reply(github.ok ? 201 : 502, github.ok);
}

export default { fetch: handleRequest };
