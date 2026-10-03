/**
 * Downloads UTA's archived evacuation diagrams for the buildings being mapped indoors.
 *
 *   npm run fetch:evac              # NH, ERB and WH
 *   npm run fetch:evac -- LIBR UC   # any other buildings, by their Evac_<code> folder
 *
 * UTA EHS took the diagrams off uta.edu in 2026; the Wayback Machine still has them. Files land
 * in tools/indoor/cache/evac/<code>/, which is gitignored. They are copyrighted: they are a
 * private reference to trace from in the Indoor Digitizer, never something to commit or publish.
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseEvacName } from './indoor.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(HERE, 'cache', 'evac');
const FOLDER = 'uta.edu/campus-ops/ehs/fire/Evac_Maps_All';
const USER_AGENT = 'mavigator-cse3311-classproject/1.0';
/** One request at a time, politely spaced: the archive is a shared, free service. */
const BETWEEN_REQUESTS_MS = 1_000;
const MAX_ATTEMPTS = 4;

const buildings = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['NH', 'ERB', 'WH'];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (response.ok) return response;
      if (attempt >= MAX_ATTEMPTS || (response.status < 500 && response.status !== 429)) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw error;
    }
    await sleep(5_000 * attempt);
  }
}

/** Every archived PDF in a building's folder, one entry per file (the index lists each once). */
async function listArchived(code: string): Promise<string[]> {
  const query =
    `https://web.archive.org/cdx/search/cdx?url=${FOLDER}/Evac_${code}/&matchType=prefix` +
    '&fl=original&collapse=urlkey&filter=statuscode:200';
  const text = await (await fetchWithRetry(query)).text();
  // The index mixes uta.edu and www.uta.edu; the file name is what identifies a diagram.
  const byName = new Map<string, string>();
  for (const url of text.split('\n').map((line) => line.trim()).filter(Boolean)) {
    const name = url.split('/').pop()!;
    if (parseEvacName(name)) byName.set(name, `https://www.${FOLDER}/Evac_${code}/${name}`);
  }
  return [...byName.values()];
}

const exists = (file: string) => stat(file).then(() => true, () => false);

async function main() {
  for (const code of buildings) {
    const dir = path.join(CACHE_DIR, code);
    await mkdir(dir, { recursive: true });
    const urls = await listArchived(code);
    let fetched = 0;
    const failed: string[] = [];

    for (const url of urls) {
      const name = url.split('/').pop()!;
      const file = path.join(dir, name);
      if (await exists(file)) continue;
      await sleep(BETWEEN_REQUESTS_MS);
      try {
        // "2026id_" asks for the newest capture, as the original bytes rather than a Wayback page.
        const response = await fetchWithRetry(`https://web.archive.org/web/2026id_/${url}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('not a PDF');
        await writeFile(file, bytes);
        fetched++;
        process.stdout.write('.');
      } catch (error) {
        failed.push(`${name}: ${(error as Error).message}`);
      }
    }

    const perFloor = new Map<string, number>();
    for (const url of urls) {
      const floor = parseEvacName(url)!.floor;
      perFloor.set(floor, (perFloor.get(floor) ?? 0) + 1);
    }
    const floors = [...perFloor].map(([floor, count]) => `${floor}:${count}`).join(' ');
    console.log(`\n${code}: ${urls.length} archived, ${fetched} downloaded now. Per floor ${floors}`);
    for (const line of failed) console.log(`  FAILED ${line}`);
  }
  console.log(`\nSaved under ${path.relative(process.cwd(), CACHE_DIR)} (gitignored; never commit these).`);
}

await main();
