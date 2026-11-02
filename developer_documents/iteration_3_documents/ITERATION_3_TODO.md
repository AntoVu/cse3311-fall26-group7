# Iteration 2.5 and 3: What's Left

Iteration 3 is due **11/01/26**. This list covers what the Iteration 2 deliverable promised for 2.5 (10/25) and 3
(11/01) that isn't finished yet. The presentation and the written deliverable are not included.

| Iteration | Promise | Status |
|---|---|---|
| 2.5 | Indoor navigation for every building east of Cooper | Drafts done by script; need review (Section 2) |
| 2.5 | "Avoid high foot traffic areas" option | Built on `feature/foot-traffic`; needs review and merge (Section 3) |
| 2.5 | Finish mapping Woolf Hall | Draft done by script; needs review (Abiy) |
| 2.5 | Recheck ERB floor 6 on site (R-04) | Not done (Section 5) |
| 3 | Rest of campus mapped | Drafts done by script; need review (Section 2) |
| 3 | MyMav schedule parser | Built on `feature/mymav-import`; needs a real paste and merge (Section 4) |

## 1. Anthony: setup (do first, today)

| Done | Task |
|:---:|---|
| ☐ | Create the GitHub repo `mavigator-indoor-digitizer` and push the local folder `Desktop/mavigator-indoor-digitizer` (one commit is already there). |
| ☐ | In that repo, go to Settings > Pages > Deploy from branch and pick `main` / root. Check that https://antovu.github.io/mavigator-indoor-digitizer/ opens. |
| ☐ | Send each person their zip from `Claude outputs/review-packs/` **privately** (direct message or Drive link shared only with them). These are UTA's copyrighted diagrams. |
| ☐ | Push `feature/door-rules` (your local copy is ahead of origin) and merge it into `main`. |
| ☐ | Merge `feature/indoor-reviews` into `main` so reviewers have the `indoor-reviews/` folder and `npm run merge:reviews` exists. |
| ☐ | Decide whether to refresh `Claude outputs/auto-trace/baseline/` with the 10/28 run (NH and ERB came out identical either way). |

## 2. Everyone: review the auto-traced buildings

The script traced 48 buildings. Each one is a draft: most rooms, doors, hallways and stairs are already in place,
and a person has to check it against the diagrams and fix the rest. The steps are in the site's README, and the
per-building checklist is in its `REVIEW.md`.

**For each building:** pick it in the tool > **Load the auto trace for this building** > **Add folder…** (your
unzipped diagrams) > fix it floor by floor > **Save this building** > commit `indoor-reviews/<building>.json` on
your own branch (`review-<name>`), one commit per building named after it. Open a draft PR after your first building
and mark it ready when all of yours are in.

| Person | Buildings |
|---|---|
| Josue | SWSH, Vandergriff Hall, College Park Center, CAPPA, Science Hall, Central Library, PE, ELB, Ransom Hall, Studio Arts Center, Wetsel, ARDRC, CELB |
| Abiy | Life Science, Pickard Hall, University Center, COBA, MAC, **Woolf Hall**, University Hall, CPB, Nanotech, Carlisle Hall, EES, ARB, Preston Hall, EHS, LCD |
| Ayesha | Fine Arts, SEIR, West Hall, Trinity Hall, UAB, The Heights on Pecan, CRB, Hammond Hall, Swift Center, College Hall, Health Center, Texas Hall, Kalpana Chawla Hall |
| Anthony | Arlington Hall, Trimble Hall, Dan Dipert Welcome Center, UTA Police, GACB, The Lofts, Thermal Energy Plant |

Done when the tool's **Checklist** panel is empty, or every item left in it has a reason.

**Known problem buildings (Anthony's list):**
- **Trimble Hall:** none of its 90 room doors can be reached from outside. Its entrances don't connect to any
  walkway. Fix the map outline or trace a walkway to a door in the Campus Digitizer.
- **Arlington Hall:** 36 rooms on floors 1 and 3 (the 133–148 and 333–348 wings) can't be reached. Find the
  hallway gap on those floors.
- **The Lofts, Thermal Energy Plant:** the script found no rooms. Trace them by hand, or mark the floors unmapped.
- **Welcome Center, UTA Police, GACB:** their map outline or walkway needs a fix.

**Anthony, after the reviews are merged:**

| Done | Task |
|:---:|---|
| ☐ | `npm run merge:reviews` > `npm run import:osm` > `npm test`. Commit `indoor-edits.json` together with the regenerated `campus-indoor.ts`, `campus-walkways.ts` and `campus-pois.ts`. |
| ☐ | Add any new split floor that is real (two wings with no hallway between them) to `KNOWN_SPLIT_FLOORS`, or fix it. `campus-data.test.ts` fails on any split floor not listed there. |
| ☐ | On the live site, route to one room in every reviewed building. |

## 3. Foot-traffic avoidance (US-03 / UC-04), branch `feature/foot-traffic`

Built and tested. The route drawer has an "Avoid crowds" chip, busy zones are drawn in amber, and the route note
says how much longer the detour is.

| Done | Task | Who |
|:---:|---|---|
| ☐ | Review the branch, run it on a phone, then push it and open a PR into `main`. | Anthony |
| ☐ | The busy zones are guesses: the library front 11:00–1:30 and the University Center 11:00–2:00 on weekdays. Walk campus at a few times and write down which places are crowded and when. Add them to `CROWD_ZONES` in `src/constants/foot-traffic.ts` (POI id, radius, weekday peak times). A data test checks the POI ids. | Anyone, one PR |
| ☐ | Phone test: set Developer > Clock to 12:00 on a weekday, route past the library with the chip on and off, and confirm the route changes and the note reads right. | Anyone |

## 4. MyMav import (US-05), branch `feature/mymav-import`

Built from PeopleSoft's page layout and a made-up sample. **It has never seen a real MyMav page.** It is under
Settings > Your Profile > Schedule > Import from MyMav.

| Done | Task | Who |
|:---:|---|---|
| ☐ | Each person: open MyMav > My Class Schedule (list view), select all, copy, and paste it into the import screen. Save the raw paste in a text file. **Don't commit it if it has your name or student ID; remove those first.** | Everyone |
| ☐ | Report what the preview got wrong: missing classes, wrong times or days, wrong building or room. | Everyone |
| ☐ | Fix `src/context/mymav-parser.ts` for whatever real pastes break, and add each cleaned-up paste as a test case in `src/context/__tests__/mymav-parser.test.ts`. | Anthony (or whoever finds the bug) |
| ☐ | Push the branch and open a PR into `main`. | Anthony |

## 5. Follow-ups promised in the Iteration 2 risk plans

Skip any of these that are already done, and note in the PR or team chat who did it and when.

| Done | Task | Risk | Who |
|:---:|---|---|---|
| ☐ | Email UTA (ehsafety@uta.edu, or Facilities at ofm@uta.edu) asking for current floor plans and permission to trace the evacuation diagrams for a class project. Was due 10/18. Save any reply in `research_notes/`. | R-08, R-10 | |
| ☐ | Go to ERB floor 6 and check it against the trace (it's marked unmapped). Photograph only for your own reference, and never commit the posted placards. If the floor can be mapped, sketch it and give the sketch to Anthony. | R-04 | |
| ☐ | Spot-check two or three reviewed buildings on site: do the room numbers and stairs match? | R-01 | |
| ☐ | Ask PATS the open parking questions: can Reduced Rate and Remote Park & Ride permits park in commuter lots after 1 PM? Are the Lot 36 and Lot 49 upgrades limited to their own zones? May anyone park in staff lots after 7 PM and on weekends? Before 7 AM? Update `src/constants/parking-permits.ts` and its tests with the answers. | — | |

## 6. Fixes from Iteration 2 user feedback

| Done | Task | Who |
|:---:|---|---|
| ☐ | Tan: a route in Nedderman went up a floor too high, then back down the stairs. Reproduce it (start inside NH in Developer, pick a room) and check for a split floor or a missing stair stop. Known NH gaps: Stairs 3's floor-1 stub (5.5 m off the lobby hallway), Stairs 5's floor-1 door (10.4 m from any hallway), and Stairs 8 has no basement stop. | Anthony (Indoor Digitizer) |
| ☐ | Blaine: Lot 49 to ERB goes down Cooper instead of the path students use. Find the shortcut on the map; if the walkway is missing, trace it in the Campus Digitizer and re-import. | Anyone |
| ☐ | Daniel and Andy: starting a route is confusing. Get one person who has never used the app to route to a class while you watch silently, and write down where they got stuck. Open a GitHub issue for each one. | Anyone |
| ☐ | Steven: adding a schedule is a pain. MyMav import (Section 4) is the main fix; also list anything still annoying in the manual Add Class form as issues. | Anyone |
| ☐ | Issue #18: permit rules for Lots 28, 39, 46, ADAN and the visitor lots. | Open, unassigned |
| ☐ | Trace Upgrade Lot 49's outline in the Campus Digitizer. It has a rule but draws nothing. | Anthony |

## 7. User testing

The inception plan has Iteration 3 ending with a test of the prototype by the five students we interviewed.

| Done | Task | Who |
|:---:|---|---|
| ☐ | After Sections 2–4 are merged and deployed, send the five testers the site link and ask each to (1) import or enter their schedule, (2) route to a class including the room, (3) try Avoid crowds, (4) check a parking recommendation. | Split the five |
| ☐ | Write each person's feedback in two or three sentences, the same way as the Iteration 2 table. | Whoever contacted them |
| ☐ | Open a GitHub issue for each bug found. | Everyone |

## Before you open any PR

Run all three and get 0 problems: `npx tsc --noEmit`, `npx expo lint`, `npm test`. Never commit the
evacuation PDFs, their renders or screenshots of them, or the PATS map PNG.
