import { formatIndoorJson, mergeReviews } from '../reviews';

const edits = { version: 1, buildings: { NH: { floors: ['1'] }, WH: { floors: ['1', '2'] } } };

describe('mergeReviews', () => {
  it("replaces each reviewed building and keeps everyone else's", () => {
    const review = { version: 1, buildings: { WH: { floors: ['1', '2', '3'] } } };
    const { merged, buildings } = mergeReviews(edits, [{ name: 'WH.json', file: review }]);
    expect(merged.buildings).toEqual({ NH: { floors: ['1'] }, WH: { floors: ['1', '2', '3'] } });
    expect(buildings).toEqual(['WH']);
  });

  it('adds a building the edits did not have', () => {
    const review = { version: 1, buildings: { SH: { floors: ['B'] } } };
    expect(Object.keys(mergeReviews(edits, [{ name: 'SH.json', file: review }]).merged.buildings)).toEqual(['NH', 'WH', 'SH']);
  });

  it('refuses a file that is not a version 1 indoor-edits.json', () => {
    expect(() => mergeReviews(edits, [{ name: 'bad.json', file: { buildings: {} } }])).toThrow('bad.json');
  });

  it('refuses two reviews of one building, rather than picking one', () => {
    const a = { version: 1, buildings: { WH: { floors: ['1'] } } };
    expect(() =>
      mergeReviews(edits, [
        { name: 'a.json', file: a },
        { name: 'b.json', file: a },
      ])
    ).toThrow('WH');
  });
});

describe('formatIndoorJson', () => {
  it("writes points and plain lists on one line, like the Indoor Digitizer's Save", () => {
    const text = formatIndoorJson({ floors: ['1', '2'], at: { lat: 1, lng: 2 }, list: [{ a: 1 }] });
    expect(text).toBe('{\n "floors": ["1","2"],\n "at": {"lat":1,"lng":2},\n "list": [\n  {\n   "a": 1\n  }\n ]\n}');
  });
});
