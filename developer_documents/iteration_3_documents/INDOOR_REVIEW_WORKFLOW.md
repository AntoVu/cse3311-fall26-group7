# Indoor Review Workflow (Iteration 3)

How the team reviews the 48 auto-traced buildings and how the reviews get into the app. What's left is in
[ITERATION_4_TODO.md](../iteration_4_documents/ITERATION_4_TODO.md).

## Still to do (from our planning, 2026-10-29)

**Anthony, before the team starts:**
- [ ] Push the site repo (`Desktop/mavigator-indoor-digitizer`); the latest local commit is 96722b6 (README update).
- [ ] Commit the `CLAUDE.md` change on `feature/door-rules` and push it.
- [ ] Push `feature/indoor-reviews` and merge it into `main` through a PR. That brings in door-rules too.
- [ ] Send each teammate their zip privately, with the site link and the "Teammate workflow" section below.
- [ ] Restore your hand-traced NH and ERB in your own browser draft: on the site, press **Start from the repo copy**.
- [ ] Run `npm run import:osm` once so your local cache stops holding every auto trace (see "Gotchas").

**Anthony, during Iteration 3:**
- [ ] Review your own seven buildings (listed under "Anthony's workflow").
- [ ] Merge reviews in batches through `indoor-mapping` branches, then rebuild and push the site.
- [ ] Review and merge `feature/foot-traffic` and `feature/mymav-import`. MyMav needs real pastes from the team first.
- [ ] Decide whether to refresh `Claude outputs/auto-trace/baseline/` with the 10/28 run.
- [ ] Delete the stale local branches (see the branch table), after deciding on `static-analysis`.
- [ ] Commit or ignore the untracked files in the repo: `developer_documents/iteration_3_documents/`,
      `developer_documents/REQUIREMENTS.xlsx`, `developer_documents/STATIC_ANALYSIS.md`, the Iteration 2 written
      deliverable `.md`, and `routes.txt`.
- [ ] Optional: copy the tool changes (resize, rotate, outline checkboxes, Place by hand carrying traces,
      repo-copy fix) to your private claude.ai copy of the Indoor Digitizer, if you still use it. So far they're
      only on the GitHub site.

**Everyone:** the reviews, then the rest of [ITERATION_4_TODO.md](../iteration_4_documents/ITERATION_4_TODO.md): busy-zone observations for
Avoid crowds, real MyMav pastes, the UTA and PATS emails, the ERB floor 6 check on site, and testing with the five
interviewed students.

**Before the final demo (Iteration 4):** remove Settings > Developer, its row, `state/dev-clock.ts` and
`components/settings/{developer-tools,room-picker}`.

## Where everything is

| What | Where |
|---|---|
| Review site (the Indoor Digitizer) | https://antovu.github.io/mavigator-indoor-digitizer/ (repo `AntoVu/mavigator-indoor-digitizer`, local copy `Desktop/mavigator-indoor-digitizer`) |
| Tool source (edit here, not in the site folder) | `Claude outputs/indoor-digitizer/indoor-digitizer.html` |
| Site build script | `python "Claude outputs/indoor-digitizer/build-site.py"`, run from the Mavigator repo root |
| Diagram zips, one per person | `Claude outputs/review-packs/<Name>.zip`, rebuilt by `make-packs.py` (its `ASSIGN` list must match the README table) |
| Per-building review checklist | The site's `REVIEW.md`, copied from `Claude outputs/INDOOR_REVIEW.md` |
| Reviewed building files | `indoor-reviews/<building>.json` in the Mavigator repo (from `feature/indoor-reviews`) |
| Auto-trace output | `Claude outputs/auto-trace/out/<key>-auto.json` and `<key>-layouts.json` |

**Never commit, upload or post the evacuation PDFs, their renders, or screenshots of them.** They're UTA's
copyrighted diagrams. Send the zips privately: each one is 45–142 MB, too big for email, so share each through
Drive or OneDrive with that one person only.

## Who reviews what

| Person | Buildings |
|---|---|
| Josue | SWSH, Vandergriff Hall, College Park Center, CAPPA, Science Hall, Central Library, PE, ELB, Ransom Hall, Studio Arts Center, Wetsel, ARDRC, CELB |
| Abiy | Life Science, Pickard Hall, University Center, COBA, MAC, Woolf Hall, University Hall, CPB, Nanotech, Carlisle Hall, EES, ARB, Preston Hall, EHS, LCD |
| Ayesha | Fine Arts, SEIR, West Hall, Trinity Hall, UAB, The Heights on Pecan, CRB, Hammond Hall, Swift Center, College Hall, Health Center, Texas Hall, Kalpana Chawla Hall |
| Anthony | Arlington Hall, Trimble Hall, Dan Dipert Welcome Center, UTA Police, GACB, The Lofts, Thermal Energy Plant |

NH and ERB were traced by hand. They're already in the app and aren't in the review list.

## Before anyone starts (Anthony)

1. On `feature/door-rules`: commit the `CLAUDE.md` change and push. One local commit (9190a7f) isn't on GitHub yet.
2. Push `feature/indoor-reviews` (it's in the worktree `Desktop/cse3311-group7-wt`):
   `git -C ../cse3311-group7-wt push -u origin feature/indoor-reviews`. Open one PR from it into `main` and merge
   it. It sits on top of door-rules, so this brings door-rules into `main` too. Tested: it merges into `main` with no
   conflicts.
3. Push the site repo and check that the site loads.
4. Send each person their zip privately, with the site link.

### Local branches not in `main` (checked 2026-10-29)

| Branch | Action | Why |
|---|---|---|
| `feature/door-rules` | Merge (through `feature/indoor-reviews`) | Its import reads the door rules the tool saves; without it the reviews can't be merged into the app data. |
| `feature/indoor-reviews` | Merge before the team starts | Adds `indoor-reviews/` and `npm run merge:reviews`. |
| `feature/foot-traffic` | Merge after review (Iteration 3 feature) | "Avoid crowds" (US-03). Merges cleanly on top. Its busy zones are guesses; see the to-do list. |
| `feature/mymav-import` | Merge after a real MyMav paste is tested | MyMav import (US-05). Merges cleanly on top. |
| `iteration2-feedback` | Nothing to do | Everything in it is already in door-rules. |
| `feature/indoor-digitizer-v2` | **Don't merge** | An old version (10/08) of indoor work that reached `main` through later branches. Merging it would conflict and could bring back older code. |
| `TwoIssuesFixBackup` | **Don't merge** | A 9/20 "temp fix" backup of the schedule; `main` has replaced it. |
| `static-analysis` | Optional | Only the static-analysis homework (ESLint config and report). |

Every other local branch is fully in `main` and can be deleted.

## Teammate workflow (Josue, Abiy, Ayesha)

**Once:**
1. Unzip your diagram zip somewhere outside the repo folder.
2. Update your clone and make your own branch:
   ```sh
   git switch main && git pull
   git switch -c review-<yourname>
   ```
3. Open the site in Chrome or Edge on a computer.

**For each building:**
1. Under **Pick a building to review…**, choose it, then press **Load the auto trace for this building**. This
   replaces only that building in your draft.
2. Press **Add folder…** and pick that building's unzipped folder (for example `SH`). The diagrams appear under the
   trace, already lined up.
3. Go floor by floor and compare with the diagram. Fix missing or misread rooms, doors in the wrong place,
   hallways that don't connect, and stairs that skip a floor. Start with that building's section of `REVIEW.md`. The
   **Checklist** panel should end up empty, or each item left in it should have a reason.
4. Press **Save this building**. It downloads `<building>.json` (for example `SH.json`).
5. Commit it:
   ```sh
   # copy SH.json into indoor-reviews/
   git add indoor-reviews/SH.json
   git commit -m "Science Hall"
   git push -u origin review-<yourname>
   ```
6. After the first building, open a **draft** PR into `main` and keep pushing to it. Mark it ready when all your
   buildings are in.

**Rules for teammates:**
- One branch per person, one commit per building, named after the building. To fix a building again: open the saved
  file (**Open indoor-edits.json**), fix it, save, copy it over the old file, and commit it as
  "Science Hall: fix floor 2 stairs".
- Change nothing else in the repo. Commit no PDFs or screenshots.
- Don't press **Start from the repo copy** or **Clear**; reviewing needs neither.
- The draft lives only in that browser. Press **Save this building** at the end of every session, and don't clear
  the browser's site data.

## Anthony's workflow

**Your own buildings:** follow the teammate workflow. Some need fixes in the Campus Digitizer first:
- **Trimble Hall:** none of its 90 room doors can be reached; its entrances join no walkway. Fix the map outline
  or trace a walkway to a door.
- **Arlington Hall:** 36 rooms on floors 1 and 3 (the 133–148 and 333–348 wings) can't be reached. Find the hallway
  gap.
- **The Lofts:** retraced 2026-10-31 with both wings in one trace (site commit 38bc127; script flags `--base 09
  --wings`): each floor is diagram x09 (the long wing and the corner) plus x00 (the other wing), placed through the
  stairs they share. Press Load the auto trace again. Each wing drew the corner stairs and elevator, so delete the
  doubles there. EHS never posted floor 1 (shops and leasing); add a floor 1 with just the entrances, stairs and
  elevator if the Lofts should be routable from the street.
- **Thermal Energy Plant:** the script found no rooms. Trace it by hand or mark the floors unmapped.
- **GACB:** EHS only ever posted one floor (diagrams 102/104/107/119, all the same view). Its one-floor stair isn't a
  missed floor: delete it, or keep it only if the diagram really shows a stair. The other two buildings in the complex
  have no diagrams in any Wayback capture. OSM draws all three as one outline (3,500 m², the trace covers a third), so
  give GACB its own map outline (mapShape) or leave the outline alone.
- **Welcome Center, UTA Police, GACB:** the map outline or walkway needs a fix.

**Merging reviews into the app** (in batches as PRs come in, not all at the end):
1. Merge the teammates' PRs into `main`. They're safe: they only add files to `indoor-reviews/`, which nothing in
   the app reads.
2. Do the risky part on a branch, since every push to `main` redeploys the live site:
   ```sh
   git switch main && git pull
   git switch -c indoor-mapping          # or indoor-mapping-2 for a later batch
   npm run merge:reviews                 # folds indoor-reviews/*.json into src/data/indoor-edits.json
   npm run import:osm                    # rebuilds the routing data
   npm test
   npx tsc --noEmit
   npx expo lint
   ```
   `merge:reviews` stops and names the files if two of them hold the same building. It always rebuilds from the
   folder, so rerunning it is safe.
3. A failing data test names the building and floor:
   - **Unreachable rooms:** send the building back to the reviewer, or fix it yourself.
   - **Split floor:** a floor whose pieces don't connect. Fix the hallway gap, or, if the floor really is two wings
     with no hallway between them, add it to `KNOWN_SPLIT_FLOORS` in `campus-data.test.ts`.
4. Check it locally (`npx expo start --web`), then commit `src/data/indoor-edits.json` with the regenerated
   `campus-indoor.ts`, `campus-walkways.ts` and `campus-pois.ts`, and open a PR from `indoor-mapping` into `main`.
5. Once it's merged, route to one room in each new building on the live app.
6. Rerun `build-site.py` and push the site repo, so **Start from the repo copy** includes the finished buildings.

## How the site works

- **Start from the repo copy** loads the buildings in `src/data/indoor-edits.json` as it was when `build-site.py`
  last ran (NH, ERB and WH right now). It replaces only those buildings in the draft; every other building stays.
  Use it to get your hand traces of NH and ERB back if a draft ever overwrites them. Press **Undo** right after if
  it replaced something you wanted.
- **Load the auto trace for this building** fetches `auto/<key>.json` from the site, replaces just that building,
  and adds the diagram positions the script worked out. So **Add folder…** lines the diagrams up automatically;
  checked on a rotated page (Science Hall floor 1) and on a building with no abbreviation (West Hall, folder WCRH).
- Drafts are stored in each person's browser (localStorage and IndexedDB). All 48 auto traces together are about
  9.5 MB, close to the storage limit, which is why buildings load one at a time.
- The site shares the `antovu.github.io` origin with the app; their storage keys don't collide.

### Tools added during Iteration 3

- **Resize and rotate a selection (Move tool):** box-select, then drag a corner square of the dashed box to resize
  (Shift keeps the proportions), or the round ↻ knob above it to rotate (Shift snaps to 15° steps). One Undo
  reverses it. A hallway or room only partly inside the box stretches.
- **Outline checkboxes** beside the floor buttons: **Floor N outline** and **Building outline**, to cut the
  clutter. An outline you're editing always shows. They reset on reload.
- **Place by hand moves the traces drawn on that diagram (2026-10-31):** "Move what was traced on this diagram with
  it" (on by default). Only points tagged with that diagram move: what you drew over it, and the auto trace's points
  from its drawing (the script now writes a `layout` on every feature, and Load the auto trace tags each point).
  Other diagrams' traces under its page stay put; before this, every point inside the page moved. Off, only the
  diagram moves. Editing a point re-tags it to the diagram on top, so place overlapping wings before editing them.
  A draft loaded before this change has untagged points: press Load the auto trace again to get the tags.

- **Multi-part floors (2026-10-31):** every diagram view the script stitched into a floor now loads as its own
  placed diagram (COBA 136/239/336, SEIR, FA, SH, SWSH, CAPPA, KC, Arlington, Vandergriff, West Hall). With
  `--wings` (run-every.sh: the Lofts, TH, UC, Vandergriff; KC and West Hall have it but their extra views were
  duplicates), a view that couldn't be stitched but has mostly new rooms is kept as a separate wing on its own
  diagram, placed through shared stairs when it can be, roughly on the outline when not: move it with Place by hand.
  New wings: the Lofts x00 (+6 a floor), TH basement B1C4 (+33), UC 180F (+8), Vandergriff x081 (+26 to 30).
  Each wing brings its own floor-outline piece. Once the wings are placed, Floor outline > **Join pieces** unions
  the pieces that overlap into one (pieces apart stay apart: drag a corner across first). Don't delete a wing's piece.

- **Fixes 2026-11-01 (site 60c575a):** Close wall gaps measures the gap to the outline over the stretch the room
  faces and stops at the nearer end (it measured at the outline wall's middle, so a long wall a few degrees off pushed
  rooms past it). Room corners snap to walls and room edges before the smart guides (with many corners a guide almost
  always lined up first, so corners never reached the floor outline). On an edge, a corner still slides along it to where a guide
  lines up with another corner, so it stops there instead of moving freely along the wall. A floor with no outline of its own uses the
  building outline for both, which is wrong where OSM's shape is (UTA Police: a plain rectangle).

- **Copy from another floor… (2026-10-31)**, under the floor buttons: copies a whole floor onto the open one, with a
  checklist (room outlines, restrooms, solid blocks, doors, gates, hallways, entrances, objects, areas, stairwell and
  elevator walls, floor outline). Room numbers: change to this floor (212 -> 312, B12 -> 112; numbers that don't start
  with the floor's are left blank and counted), keep, or blank. "Replace what floor N has of the checked kinds" (on by
  default) clears those first, so an auto-traced floor doesn't end up doubled. Stairwell walls only go where that stair
  stops (Goes to floors adds stops). One Undo. Tested on the Lofts: floor 2 onto 3 gave 50 doors all 3xx, and Undo
  restored floor 3 exactly. The copies have no diagram tag, so Place by hand on that floor won't carry them.

- **Simplify shapes (less lag)**, next to Load the auto trace: drops points within 15 cm of a straight line from
  room walls and floor outlines (not curved rooms, not the building outline). The script traces walls pixel by
  pixel: Arlington Hall had 18,302 such points (one floor outline alone had 5,533), and hovering or panning froze
  the page for 3.4 s in a test. After Simplify: 3,832 points and no freezes. `build-site.py` applies the same
  simplification to the site's auto traces (2026-10-31), so anyone loading a building after that gets the light
  version. Drafts already in someone's browser are untouched; they press the button. One Undo reverses it.

- **Square to angles…** (next to Simplify) opens a panel with checkboxes for **Rooms** (on: restrooms, stairwells,
  elevators and solid blocks included), **Floor outlines** and **Hallways**, plus "Every floor" (off: just this
  floor). It turns each wall within 8° of 0/30/45/60/90° (measured from the diagram the shape sits on, or the
  leveled wall) to that angle, and makes each corner where its two walls meet. Walls further off (a real angled
  facade) stay. A shape that would cross itself or change area by over 10% is left alone. The **Snap angles**
  checkbox (was "Snap 45°") uses the same angles while drawing, as do the box room shape and the smart guides.
  - Tested 2026-10-31: Arlington Hall went from 30% to 90% of its wall length on an allowed angle (Carlisle Hall 94% to
    97%). What's left is short corner jogs, about 10° off. Room centers moved a median of 1–18 cm. Undo restores
    exactly. Carlisle Hall's routes are identical before and after squaring hallways.
  - **Hallways:** squaring them keeps junctions joined, but it moves ends by centimeters. Where the trace already has
    gaps, that can change which piece the import bridges a gap to. In Arlington Hall floor 2 this exposed 6
    already-broken doors of rooms 285 and 298 (both rooms still route). So join gaps first, then square hallways.
  - Saved files round coordinates to about 1 cm (7 decimals), so a saved short wall can read up to 0.3° off. In the
    tool it's exact.
- **Close wall gaps…** (next to Square) grows rooms across the gaps the script leaves, which are each about one
  wall thick. The panel has:
  - **Meet neighboring rooms in the middle**, up to 0.6 m (adjustable);
  - **Extend rooms to the floor outline**, up to 0.8 m (adjustable);
  - **Every floor**.

  How it decides:
  - A wall moves only if what it faces covers 60% of its length at one distance.
  - It moves half the gap when the neighbor's wall moves too, and the whole gap when that wall stays, faces a solid
    block (which never moves) or faces the outline.
  - It never crosses a traced hallway, and a room that would cross itself or swallow another room's center is left
    alone.

  Why those limits: gaps measured between facing rooms in the auto traces are walls at 0.05–0.45 m and hallways at
  1.5 m and up, with almost nothing in between.

  | | 0–0.45 m | 0.45–0.6 m | 0.6–1.5 m | 1.5 m and up |
  |---|---|---|---|---|
  | Carlisle Hall | 102 | 11 | 5 | 41 |
  | Arlington Hall | 73 | 0 | 11 | 303 |
  | Science Hall | 554 | 17 | 53 | 260 |

  Tested 2026-10-31, after Square:
  - Arlington Hall closed all 101 wall gaps; Carlisle Hall closed 98 of 113 (the rest are rooms left alone or walls
    only partly facing a neighbor).
  - Every hallway gap is untouched, and Carlisle Hall routes the same.
  - One Undo restores exactly.
  - Diagonal corner cuts the script made can leave a small notch where two rooms meet the outline; fix those by hand.
- **Delete in Move** (Delete/Backspace, or the Delete button in the Move panel): removes what is boxed.
  - An item with all its points on this floor boxed goes whole.
  - Otherwise just the boxed corners of a room, area or hallway go, which is how to remove a cutout inside a room.
    If fewer than 3 corners would remain in a room (2 points in a hallway), it goes whole.
  - Doors, gates and other fixed-shape items go only when boxed whole. A stair or elevator goes only if it serves
    just this floor (use Goes to floors otherwise); its extra entrances go one by one.
  - One Undo restores. Tested on Carlisle Hall floor 3 (2 corners, then 2 whole rooms).
- `pointOn(ll, floor)` (2026-10-31) tags a point with *its own floor's* diagram. Square and Close gaps use it on
  "Every floor"; before that, Square tagged other floors' points with the open floor's diagram.
- Self-check of the geometry (Square and Close gaps): `node "Claude outputs/indoor-digitizer/geometry-check.js"
  "Claude outputs/indoor-digitizer/indoor-digitizer.html"` (silent = pass, 17 cases).

### Gotchas

- `route-check.sh` imports every auto trace into a temporary `indoor-edits.json` and restores `src/data/` after,
  but **leaves `tools/osm/cache/digitizer-base.json` holding all of them**. `build-site.py` now reads the indoor copy
  from `src/data/indoor-edits.json` instead of that cache. Run `npm run import:osm` once to clean your own cache.
- After editing the tool source: `python "Claude outputs/indoor-digitizer/build-site.py"`, commit in the site
  folder, push. The `.html` source is not in the Mavigator repo.
- If you change who reviews what, update `ASSIGN` in `make-packs.py` and the README table together, then rerun
  `make-packs.py`.

## Auto-trace status (full rerun, 2026-10-28)

- 48 buildings traced with diagram positions; NH and ERB came out identical to `baseline/`.
- Every room door routes from outside except Trimble Hall (0/90), Arlington Hall (329/365), and The Lofts and
  Thermal Energy Plant (no rooms found).
- The route check's one failing test appears in every route check: it comes from importing all the auto traces at
  once, not from a change.
- `baseline/` hasn't been refreshed with this run; that's still your decision.
- Per-building verdicts: `Claude outputs/AUTO_TRACE_ISSUES.md`. Checklist: `Claude outputs/INDOOR_REVIEW.md`.
