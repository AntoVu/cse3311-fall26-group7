// npm run merge:reviews -- folds indoor-reviews/*.json into src/data/indoor-edits.json (tools/indoor/reviews.ts).
// Then run npm run import:osm and npm test, and commit indoor-edits.json with the regenerated data.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { formatIndoorJson, mergeReviews } from './reviews.ts';

const EDITS = 'src/data/indoor-edits.json';
const DIR = 'indoor-reviews';
const reviews = readdirSync(DIR)
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({ name, file: JSON.parse(readFileSync(join(DIR, name), 'utf8')) }));
const { merged, buildings } = mergeReviews(JSON.parse(readFileSync(EDITS, 'utf8')), reviews);
writeFileSync(EDITS, `${formatIndoorJson(merged)}\n`);
console.log(`Merged ${buildings.length} building(s) into ${EDITS}: ${buildings.join(', ') || 'none'}`);
