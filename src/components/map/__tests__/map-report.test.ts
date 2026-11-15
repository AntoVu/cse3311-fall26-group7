import { reportIssueUrl, roomAt } from '@/components/map/map-report';

const NH = { id: 'academic-nedderman-hall', name: 'Nedderman Hall', abbreviation: 'NH' };

describe('reportIssueUrl', () => {
  it('fills in a GitHub issue with the problem, the place and the note', () => {
    const url = reportIssueUrl({
      kind: 'missing-object',
      building: NH,
      floor: '3',
      room: '340',
      at: { lat: 32.7331234567, lng: -97.1131 },
      note: 'Water fountain by the stairs & elevator',
    });
    expect(url.startsWith('https://github.com/AntoVu/cse3311-fall26-group7/issues/new?title=')).toBe(true);
    const params = Object.fromEntries(
      url.split('?')[1].split('&').map((pair) => pair.split('=').map(decodeURIComponent))
    );
    expect(params.title).toBe('Map report: Missing object (NH, floor 3, room 340)');
    expect(params.labels).toBe('map-report');
    expect(params.body).toContain('**Floor:** 3');
    expect(params.body).toContain('**Marked at:** 32.733123, -97.113100');
    expect(params.body).toContain('Water fountain by the stairs & elevator');
  });

  it('leaves out what was not given', () => {
    const body = decodeURIComponent(
      reportIssueUrl({ kind: 'other', building: { id: 'misc-x', name: 'X' }, note: ' ' }).split('body=')[1].split('&')[0]
    );
    expect(body).not.toContain('Floor');
    expect(body).not.toContain('Marked at');
    expect(body).toContain('(none given)');
  });
});

describe('roomAt', () => {
  const square = (lat: number, lng: number) => [
    { lat, lng },
    { lat, lng: lng + 1 },
    { lat: lat + 1, lng: lng + 1 },
    { lat: lat + 1, lng },
  ];
  const rooms = [{ ring: square(0, 0) }, { room: '101', ring: square(0, 0) }, { room: '102', ring: square(0, 2) }];

  it('finds the numbered room around a point, and nothing outside every room', () => {
    expect(roomAt(rooms, { lat: 0.5, lng: 0.5 })).toBe('101');
    expect(roomAt(rooms, { lat: 0.5, lng: 2.5 })).toBe('102');
    expect(roomAt(rooms, { lat: 0.5, lng: 1.5 })).toBeUndefined();
  });
});
