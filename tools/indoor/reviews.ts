/**
 * Folds the team's reviewed buildings (indoor-reviews/<building>.json, each saved with the Indoor Digitizer's
 * "Save this building") into src/data/indoor-edits.json. Pure, so it is tested; merge-reviews.mts does the files.
 */

type IndoorFile = { version: number; buildings: Record<string, unknown> };

export function mergeReviews(
  edits: IndoorFile,
  reviews: { name: string; file: unknown }[]
): { merged: IndoorFile; buildings: string[] } {
  const buildings = { ...edits.buildings };
  const from: Record<string, string> = {};
  for (const { name, file } of reviews) {
    const review = file as Partial<IndoorFile>;
    if (review?.version !== 1 || typeof review.buildings !== 'object' || !review.buildings) {
      throw new Error(`${name} is not a version 1 indoor-edits.json`);
    }
    for (const [key, building] of Object.entries(review.buildings)) {
      if (from[key]) throw new Error(`${key} is reviewed in both ${from[key]} and ${name}; keep one`);
      from[key] = name;
      buildings[key] = building;
    }
  }
  return { merged: { ...edits, buildings }, buildings: Object.keys(from) };
}

/** The Indoor Digitizer's formatJson: indented, with each point and each list of plain values on one line. */
export function formatIndoorJson(value: unknown, pad = ''): string {
  const inner = `${pad} `;
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    if (value.every((x) => x === null || typeof x !== 'object')) return JSON.stringify(value);
    return `[\n${value.map((x) => inner + formatIndoorJson(x, inner)).join(',\n')}\n${pad}]`;
  }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.lat === 'number' && typeof v.lng === 'number') return JSON.stringify(v);
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (!keys.length) return '{}';
    return `{\n${keys.map((k) => `${inner}${JSON.stringify(k)}: ${formatIndoorJson(v[k], inner)}`).join(',\n')}\n${pad}}`;
  }
  return JSON.stringify(value);
}
