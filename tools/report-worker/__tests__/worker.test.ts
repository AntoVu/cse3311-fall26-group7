import { reportIssue } from '@/components/map/map-report';
import { CAMPUS_POIS } from '@/data/campus-pois';

import { handleRequest, parseReport, type Env } from '../worker.ts';

const GOOD = {
  kind: 'missing-object',
  building: { id: 'academic-nedderman-hall', name: 'Nedderman Hall', abbreviation: 'NH' },
  floor: '3',
  room: '340',
  at: { lat: 32.7331, lng: -97.1131 },
  note: 'Water fountain by the stairs',
};

describe('parseReport', () => {
  it('accepts a good report and drops unknown fields', () => {
    expect(parseReport({ ...GOOD, extra: 'x' })).toEqual(GOOD);
  });

  it('accepts every building on the map', () => {
    for (const poi of CAMPUS_POIS) {
      const building = { id: poi.id, name: poi.name, ...(poi.abbreviation && { abbreviation: poi.abbreviation }) };
      expect([poi.name, parseReport({ ...GOOD, building })]).toEqual([poi.name, expect.objectContaining({ building })]);
    }
  });

  it.each([
    ['an unknown kind', { kind: 'spam' }],
    ['a note that is too long', { note: 'x'.repeat(1001) }],
    ['a spot off campus', { at: { lat: 40, lng: -74 } }],
    ['a room with markup', { room: '<b>1</b>' }],
    ['a building name with a mention', { building: { id: 'a', name: '@someone' } }],
  ])('rejects %s', (_, change) => {
    expect(parseReport({ ...GOOD, ...change })).toBeNull();
  });

  it('accepts traced room names like ELEC-2_1 and a basement floor', () => {
    expect(parseReport({ ...GOOD, floor: 'B', room: 'ELEC-2_1' })).toEqual({ ...GOOD, floor: 'B', room: 'ELEC-2_1' });
  });

  it('strips control characters from the note', () => {
    expect(parseReport({ ...GOOD, note: 'a\u0000b\nc' })?.note).toBe('ab\nc');
  });
});

describe('reportIssue', () => {
  it('puts the note in a code block it cannot break out of', () => {
    const { body } = reportIssue({ ...parseReport(GOOD)!, note: 'hi @someone ```' });
    expect(body).toContain('````text\nhi @someone ```\n````');
  });
});

describe('handleRequest', () => {
  const env = (overrides: Partial<Env> = {}): Env => ({
    GITHUB_TOKEN: 'secret-token',
    GITHUB_REPO: 'owner/reports',
    ALLOWED_ORIGINS: 'https://antovu.github.io, http://localhost:8081',
    ...overrides,
  });
  const post = (body: unknown, origin = 'https://antovu.github.io') =>
    new Request('https://worker.example/', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  const github = jest.fn();

  beforeEach(() => {
    github.mockReset().mockResolvedValue(new Response('{}', { status: 201 }));
    global.fetch = github as typeof fetch;
  });

  it('files the issue in the reports repo with the token, and returns nothing but ok', async () => {
    const response = await handleRequest(post(GOOD), env());
    expect(response.status).toBe(201);
    const text = await response.text();
    expect(text).toBe('{"ok":true}');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://antovu.github.io');
    const [url, init] = github.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/owner/reports/issues');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    expect(JSON.parse(init.body)).toEqual(reportIssue(GOOD as never));
  });

  it('refuses other websites, bad reports and wrong methods without calling GitHub', async () => {
    expect((await handleRequest(post(GOOD, 'https://evil.example'), env())).status).toBe(403);
    expect((await handleRequest(post({ ...GOOD, kind: 'x' }), env())).status).toBe(400);
    expect((await handleRequest(post('not json'), env())).status).toBe(400);
    expect((await handleRequest(post({ ...GOOD, note: 'x'.repeat(5000) }), env())).status).toBe(413);
    const get = new Request('https://worker.example/', { headers: { Origin: 'https://antovu.github.io' } });
    expect((await handleRequest(get, env())).status).toBe(405);
    expect(github).not.toHaveBeenCalled();
  });

  it('answers the browser preflight', async () => {
    const preflight = new Request('https://worker.example/', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:8081' },
    });
    const response = await handleRequest(preflight, env());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST');
  });

  it('stops at the rate limit, keyed by IP', async () => {
    const limit = jest.fn().mockResolvedValue({ success: false });
    const response = await handleRequest(post(GOOD), env({ PER_IP: { limit } }));
    expect(response.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: '1.2.3.4' });
    expect(github).not.toHaveBeenCalled();
  });

  it("says only that it failed when GitHub refuses, without GitHub's answer", async () => {
    github.mockResolvedValue(new Response('{"message":"Bad credentials"}', { status: 401 }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const response = await handleRequest(post(GOOD), env());
    expect(response.status).toBe(502);
    expect(await response.text()).toBe('{"ok":false}');
  });
});
