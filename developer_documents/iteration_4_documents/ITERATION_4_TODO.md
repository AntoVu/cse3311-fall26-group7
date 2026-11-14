# Iteration 4: What's Left

Iteration 4 is due **11/15/26** and ends with the final demo. The inception plan gives it "polish, iOS and Android
compatibility testing, final demo". This list collects:
- the Iteration 4 plans in the Iteration 3 deliverable;
- what the Iteration 2 deliverable promised and didn't finish;
- what the risk plans and user feedback still owe;
- what was found while merging Iteration 3;
- the backlog audit of 2026-11-10 (sections 7 to 9): every promise from inception to Iteration 3, checked against
  the code.

Items marked **(new)** were not in the Iteration 3 deliverable's list.

## 1. Indoor maps

The app has 50 buildings:
- **2 hand traced:** NH and ERB.
- **32 reviewed** by the team.
- **16 unreviewed auto traces**, in as drafts so the app covers them: ARDRC, CAPPA, CELB, ELB, LIBR, SEIR, SH, SWSH,
  TXH, UAB, Swift Center, Wetsel, College Park Center, Trinity Hall, Vandergriff Hall, West Hall.

| Done | Task | Who |
|:---:|---|---|
| ☐ | **(new)** Review the 16 unreviewed auto traces, the same way as Iteration 3. Save each to `indoor-reviews/`; `merge:reviews` replaces the draft. They were assigned to Josue (SWSH, Vandergriff, College Park Center, CAPPA, SH, LIBR, ELB, Wetsel, ARDRC, CELB) and Ayesha (SEIR, West Hall, Trinity, UAB, Swift Center, Texas Hall). | Josue, Ayesha |
| ☐ | **(new)** Fix the 29 tracing-gap split floors (31 listed) in `KNOWN_SPLIT_FLOORS` (`src/data/__tests__/campus-data.test.ts`). A route between the pieces of a split floor goes up a stair and back down, the bug Tan reported. Remove each line once it's fixed; the test fails until the list matches. **Real splits** (ERB 1 and 2: the wings meet only on other floors) stay. | Whoever reviewed the building |
| ☐ | NH's known gaps: Stairs 3's floor-1 stub (5.5 m off the lobby hallway), Stairs 5's floor-1 door (10.4 m from any hallway), and Stairs 8 has no basement stop. | Anthony |
| ☐ | **(new)** Anthony's cleanup pass (Indoor Digitizer **Clean up building**, outlines, gaps, doors). **Done (18):** WH, ARB, CAH, COBA, EES, CPB, EHS, LCD, PH, UH, PKH, NANO, MAC, CH, CRB, FA, HH, Health Center; NH and ERB were hand traced. Stopped there on 2026-11-13 to work on features. **Still to do (30), each from its repo copy in `indoor-reviews/`, not the auto trace:** reviewed by a teammate: KC, LS, UC, PE, RH, SAC, The Heights on Pecan; reviewed by Anthony on 2026-11-01 (before the cleanup tools): GACB, TH, Thermal Energy Plant, Dan Dipert Welcome Center, UTA Police Department, The Lofts, Arlington Hall. Never reviewed, only the auto trace (`Claude outputs/auto-trace/out/<key>-auto.json`): the 16 above. | Anthony |
| ☐ | Smooth and fix the jagged auto-traced outlines. The deliverable showed Woolf Hall as the example. The Indoor Digitizer's **Simplify**, **Square to angles** and **Tidy rooms** (2026-11-11: teeth, cut corners, rows, overlaps) do most of it; **Line up to a line** fixes a row by hand. | Everyone |
| ☐ | ERB floor 6 (R-04): visit it, check it against the trace, and map it or keep it marked unmapped. The Iteration 3 deliverable promised this for Iteration 4. | Anyone on campus |
| ☐ | Confirm buildings on site, and add objects: vending machines, microwaves, water fountains, refill stations. Spot-check room numbers and stairs in two or three reviewed buildings (R-12). Use the phone tool **Mavigator Indoor Validation** (`antovu.github.io/mavigator-indoor-validation`, built 2026-11-11): check, flag, retype, move and add on site, then send the fixes file. | Everyone |
| ☐ | **(new)** Build the Indoor Digitizer's **Open field fixes** import for the validation tool's export (format in that repo's README), then apply the walk's fixes. | Anthony |
| ☐ | **(new)** The import report lists entrances that join no walkway and doors more than 10 m from a hallway. Fix them, or trace a walkway in the Campus Digitizer. | Reviewers |
| ☐ | GACB has a diagram for only one of its buildings (R-08). Map the rest by walking it, or leave it routing to the door. | Anyone on campus |

## 2. Features and fixes

| Done | Task | Who |
|:---:|---|---|
| ☑ | Better explain MyMav import: show which page to copy (week view or List View) and where to find it, with a picture or step list on the import screen. | |
| ☐ | Collect more real MyMav pastes from teammates and testers, with names and IDs removed. Add each one as a test in `mymav-parser.test.ts`, and fix what breaks (R-13). | Everyone |
| ☐ | Fine-tune Avoid crowds. Per the deliverable: Monday to Thursday at full strength, lighter on Fridays, off on weekends (**done in code 2026-11-02**: Fridays cost 2x instead of 4x; walking campus is still to do). Walk campus at a few times to confirm the two zones and the 11 AM to 3 PM window. Zones are `CROWD_ZONES` in `src/constants/foot-traffic.ts`. | |
| ☐ | Make sure every parking rule is right. Ask PATS: may Reduced Rate and Remote Park & Ride park in commuter lots after 1 PM? Are the Lot 36 and Lot 49 upgrades limited to their zones? May anyone park in staff lots after 7 PM, on weekends, and before 7 AM? Update `parking-permits.ts` and its tests. | |
| ☐ | Issue #18: permit rules for Lots 28, 39, 46, ADAN and the visitor lots. | |
| ☐ | Fix building names. Check the map's names and abbreviations against UTA's own list. Wrong so far: **Carlisle Hall is CARH, not CAH** (set in `src/data/map-labels.ts`; the indoor data is keyed by it too, so rename the `CAH` key in `indoor-edits.json` and `indoor-reviews/CAH.json` at the same time, then `npm run import:osm` and `npm test`). Add others here as they turn up. | |
| ☐ | **(new)** Alias names for buildings, the names people actually use: the Chemistry & Physics Building is often called the Planetarium. Add an `aliases` list per building (`src/data/map-labels.ts`, carried through the import onto the POI), match it in the building picker's search (`building-picker-field.tsx`, which matches only name and abbreviation today) and the MyMav parser, and show it on the building card. Collect more aliases from teammates and testers. | |
| ☐ | **(new)** Find out what Anthony's note "THE LATITUDE AND LONGITUDE ARE WRONG" means (`Claude outputs/CONFIRMATIONS_NEEDED.md`), and fix it or delete it. | Anthony |
| ☐ | Blaine's feedback: Lot 49 to ERB goes down Cooper instead of the path students use. Trace the missing walkway in the Campus Digitizer and re-import. | |
| ☑ | Schedule: Edit should let you change a class, not only delete it (Iteration 2). | |
| ☑ | Schedule: center the day-of-the-week buttons (Iteration 2). | |
| ☐ | Schedule: start and end time buttons go off screen on iOS (Iteration 2). **Fixed in code 2026-11-02** (the usual Safari time-input width fix); confirm on an iPhone. | |
| ☑ | Building preview: one-finger panning on the indoor view doesn't work until a pinch starts (Iteration 2). | |
| ☐ | Building preview: it takes too much of the screen; collapse it unless opened (Iteration 2). Opening it as just the info card was tried on 2026-11-02 and reverted: opening on the outdoor view felt better. Needs another idea, or drop it. | |
| ☐ | Parking tab: decide whether to fold it into the Map tab and add a Navigation tab (Iteration 2). Big change: decide early or drop it. | Team decision |
| ☑ | **(new)** Staff route toggle: a Settings switch that lets staff route through keycard doors. The data and the router already support it; see `Claude outputs/PLANNED_FEATURES.md`. Optional. | |
| ☑ | **(new, broken promises from section 7)** UC-02: the route screen asks "Go around?" when a walk crosses a busy area. On-Campus Residence: pick your hall or apartment; it becomes your start point and the start picker lists it as Home. Parking: tapping a lot shows whether your pass can park there now (or from when) and the walk to your next class. MyMav: a paste missing days or starting mid-day says so. Faculty lots F1, F4-F9 and F17 got the faculty rule. `REQUIREMENTS.xlsx` brought up to date (109 requirements, 104 done). | |
| ☐ | **(new)** On campus, check the "You're in <building> · Go inside" prompt (UC-05): it shows when your location is inside the class's building. Ask PATS whether F1, F4-F9 and F17 really follow the other F lots' rule. | |
| ☐ | Andy and Daniel: starting a route is confusing. Watch someone new route to a class, note where they get stuck, and fix those spots. | |
| ☐ | UI updates for looks. Steven called the UI "janky". Go screen by screen on a phone. | |

## 3. Website and bugs

| Done | Task | Who |
|:---:|---|---|
| ☑ | **(new)** React error #418 (R-11): the route and indoor screens opened from the Map tab log a hydration warning on first load. The page still works. Find what renders differently from the build (likely the query string) and wait for `useHasHydrated()`. | Anthony |
| ☑ | **(new)** Reloading an indoor or Map-tab route URL on the live site hits the 404 fallback, which is the class route page. Make the fallback handle `/map/route` and the indoor pages, or send them back to the map. | |
| ☐ | **(new)** Test on real phones: iPhone Safari and Android Chrome. Check pinch and pan, the long-press pin, the GPS prompt on campus, the time picker, Add to Home Screen, and the empty strip under the tab bar in the Home Screen app. Removing the strip was tried on 2026-11-02 and reverted: the tab bar disappeared on iOS. | Everyone with a phone |
| ☐ | **(new)** Check load time on cellular data on the live site, not through the tunnel. | |
| ☐ | Maybe: move off GitHub Pages for a nicer URL (the Iteration 3 deliverable mentions it). Optional. | |

## 4. Code and repo cleanup

| Done | Task | Who |
|:---:|---|---|
| ☑ | Static analysis fixes: 494 problems from typescript-eslint's strict rules (`developer_documents/STATIC_ANALYSIS.md`). At least the four analyzed: W1 floating promise (`use-device-location.ts`), W2 enum compare (`Location.PermissionStatus.GRANTED`), W3 promise passed to `onPress` (`schedule/index.tsx`), and W4 (a false positive: suppress it with a comment). Then the next riskiest rules. | Anthony |
| ☐ | **(new)** Before the final demo, remove Settings > Developer: `src/app/settings/developer.tsx`, its row, `state/dev-clock.ts`, `components/settings/developer-tools.ts` and `room-picker.tsx`. Keep `components/ui/chip.tsx`. Update the README's Avoid crowds test step, which uses the Developer clock. | Anthony |
| ☑ | Clean up junk in the repo: `routes.txt` (empty), `Iteration 3 (Written Deliverable) DRAFT.md` (now that the submitted one is in), and the stale `RISK_ASSESSMENT.md` and `DEVELOPMENT_PLAN.md` in `inception_documents/`. | |
| ☐ | **(new)** Delete merged branches on GitHub: about 30 old feature and review branches. | Anthony |
| ☑ | **(new)** Check whether react-native-svg still adds the Responder props; if it stopped, delete `src/components/map/quiet-svg-responder-warning.ts`. **Checked 2026-11-02:** 15.16.0 (latest) still adds them and Expo SDK 57 pins 15.15.4, so the shim stays. | |
| ☐ | Keep `npx tsc --noEmit`, `npx expo lint` and `npm test` at 0 problems, and update the README's test count at the end. | Everyone |

## 5. Outside the team

| Done | Task | Who |
|:---:|---|---|
| ☐ | Email UTA EHS (ehsafety@uta.edu) or Facilities (ofm@uta.edu) for permission to trace the evacuation diagrams and for current floor plans. Not sent as of Iteration 3 (R-10, R-08). If they say no, the fallback is indoor maps behind a UTA login. | |
| ☐ | Ask PATS whether a lot occupancy feed (Parking Finder / Modii) can be shared. Without one, the "likelihood of finding a spot" half of US-01 stays out, and the final document should say so. | |

## 6. User testing and final delivery

| Done | Task | Who |
|:---:|---|---|
| ☐ | Final test with the five users: import or enter a schedule, route to a class and room, try Avoid crowds, check a parking recommendation. Write each one's feedback in two or three sentences. Steven missed Iteration 3, so get his. | Split the five |
| ☐ | Open a GitHub issue for each bug the testers find. | Everyone |
| ☐ | Final written deliverable: evaluated hash, effort table, risks, test count, screenshots. | Everyone |
| ☐ | Final presentation slides and the demo, rehearsed on a phone with the live site. | Everyone |

## Before you open any PR

Run all three and get 0 problems: `npx tsc --noEmit`, `npx expo lint`, `npm test`. Never commit the evacuation
PDFs, their renders or screenshots of them, or the PATS map PNG.

## 7. Promises from earlier deliverables

From the backlog audit of 2026-11-10, checked against the code and GitHub. Sources: the inception documents
(`INCEPTION.md`, `USER_STORIES.md`, `USE_CASE_MODEL.md`), the Iteration 1 to 3 deliverables, the Iteration 3
presentation and its backlog slide, and `REQUIREMENTS.xlsx`. Each row is something a deliverable promised, or said
was done, that wasn't true at the time. Statuses include the fixes on branch `promises`.

| # | What we said | Where | Status now |
|---|---|---|---|
| 1 | "Every user story and use case is now implemented." | Iteration 3 intro | **Not quite.** Rows 2 and 3 are the gaps. Correct the claim in the final document or finish them. |
| 2 | US-01: recommendations "account for high populated hours" and "time of year", and prefer lots "less likely to be filled". | Inception; Iteration 2 MoSCoW (Could) | **Not built.** Lots are ranked by walking time only, and there's no occupancy data. Issue #41. |
| 3 | UC-05: the app notices the user is indoors and switches to indoor navigation. | Inception use case; `FR-IND-15` | **Partly built** (`promises`). When your location is inside the building, the button reads "You're in <building> · Go inside". It never switches by itself, because GPS drifts indoors. Say so in the final document and present the button as the design. |
| 4 | UC-02 error flow: when a route crosses a busy area, the app asks whether to reroute. | Inception use case | **Done** (`promises`): the route drawer asks "Go around?". |
| 5 | Contact UTA for floor plans and for permission to trace the evacuation diagrams. | Iteration 1 (CASIM request); Iteration 2 ("by 10/18") | **Missed twice.** Still open (R-10, R-08); in section 5. |
| 6 | Recheck ERB floor 6 on site. | Iteration 2; Iteration 3 ("will be in Iteration 4") | **Not done**; in section 1. |
| 7 | Re-check mapped buildings every iteration. | Iteration 1 (R-09), Iteration 2 (R-01) | **Never done** as a routine. The walk with the validation tool covers it. |
| 8 | iOS and Android compatibility testing. | Inception plan for Iteration 4; Iteration 1 claimed "all features were checked by hand on iOS and Android" | **Not done** since the move to a website (`NFR-PLT-08`); in section 3. |
| 9 | All auto traces reviewed. | Iteration 3 R-12 | **16 still unreviewed** (section 1). The slides say 24 reviewed and this list says 32: settle the number for the final document. |
| 10 | Prototype test with all five interviewed students. | Inception plan for Iteration 3 | **4 of 5.** Steven's feedback is missing; in section 6. |
| 11 | "Add photo guide for importing MyMav schedule." | Iteration 3 backlog slide | **Text steps only.** A real screenshot would show someone's schedule, so blur one or drop the word "photo". |
| 12 | Tapping a lot shows its status and recommendation details. | Iteration 1; `FR-PRK-15` | **Done on the Parking tab** (`promises`): the lot's status and the walk to your next class. Lots still aren't tappable on the Map tab. |
| 13 | On-Campus Residence in Settings > Your Profile. | Iteration 1 (disabled row); `FR-SET-07`, US-04 | **Done** (`promises`): a saved Home start point. |
| 14 | Parking rules confirmed and complete. | Iterations 1, 2 and 3 | **Not confirmed with PATS.** No rules yet for Lots 28, 39, 46, ADAN or the visitor lots (`FR-PRK-11`, `FR-PRK-12`, issue #18). The F lots got the faculty rule on `promises`, unconfirmed. |
| 15 | Fixes from Iteration 2 user feedback. | Iteration 2 | **Still open:** Tan's up-and-down stair routes (split floors), Blaine's Lot 49 to ERB walk, Andy and Daniel's confusing route start, Steven's "janky" UI. All in sections 1 and 2. |
| 16 | Remove Settings > Developer before the final demo. | Iteration 2 | Still present; in section 4. |
| 17 | `REQUIREMENTS.xlsx` is the living list. | Iteration 2 | **Done** (`promises`): 109 requirements, 104 complete. Iteration 3's reused IDs now map to: its FR-IND-11 = FR-IND-14 (plus FR-IND-11 to 13), FR-IND-12 = **FR-IND-16**, FR-IND-13 = **FR-IND-17**, FR-SCH-08 = FR-SCH-14/15, FR-RTE-10 = FR-TRF-02/04. Use the new numbers in the final document. |
| 18 | The app is client-side only, with no backend. | Inception tech design; `NFR-ARC-01` | **Changes** with the report Worker (on `promises`). Say so in the final document. |
| 19 | Iteration 3's Development Plan section. | Iteration 3 deliverable | It has a leftover placeholder ("Paragraph"). Don't copy it into the final document. |

## 8. Backlog slide items not covered above

From the Iteration 3 backlog slide, whose last milestone is "Complete all items on the Backlog".

| Done | Item | Status and note |
|:---:|---|---|
| ☐ | **Object finding** (nearest vending machine, microwave) | Not started. The data is nearly empty (6 vending machines, all in Arlington Hall), so collecting objects on the walk comes first. |
| ☐ | **Report missing or incorrect data** | Built, on `promises`. Needs the Cloudflare Worker deployed (`tools/report-worker/README.md`) and `REPORT_ENDPOINT` set; until then it falls back to a public GitHub issue. |
| ☐ | **Navigation from all locations** | Unclear. Today a route can start from GPS, a dropped pin, any building, Home or any lot. Starting from a room exists only in Settings > Developer. Decide what it means; probably "start from a room". |
| ☐ | **Drive time for outdoor locations** (streets only) | Not started. Streets are drawn but aren't a routable graph, and have no one-way or turn rules. A big job; consider cutting it. |
| ☐ | **Parking availability predictions** | Not started (issue #41); no data source. Same gap as row 2 of section 7. |
| ☐ | **Improve routing engine** | Vague. In practice: fix the split floors and Blaine's walkway (sections 1 and 2). |
| ☑ | **Keep the Indoor Digitizer repo free of diagrams** | Checked 2026-11-10: `AntoVu/mavigator-indoor-digitizer` has no PDFs or images. The Iteration 3 references still say the tools are "not in the repository": update that in the final document. |

## 9. Done since it was promised

For the final document's accomplishments:
- **Indoor maps:** Woolf Hall, the buildings east of Cooper, and the rest of campus (50 buildings).
- **Imports and crowds:** MyMav import; Avoid crowds with lighter Fridays and no weekends; the "Go around?" prompt.
- **Schedule:** edit a class; centered day buttons; "+ Add class" hidden in Edit mode.
- **Maps:** one-finger pan in the building preview; Upgrade Lot 49 drawn; lot status on tap; the "You're in"
  prompt.
- **Settings:** staff-only door toggle; On-Campus Residence as Home; time and unit settings applied everywhere;
  settings and classes saved.
- **Website and code:** standalone website (no Expo tunnel); React #418 and reload 404 fixes; Expo template art
  replaced; static analysis W1 to W4.
- **Tools:** the Indoor Digitizer's Tidy rooms and Line up to a line; the Indoor Validation phone tool.

## 10. Rename the repo to `mavigator`

Rename `AntoVu/cse3311-fall26-group7` to `AntoVu/mavigator`, now that the hosted site is the product.

**What GitHub handles:** links to the old repo, and `git clone`, `pull` and `push`, redirect to the new name.
Issues, PRs, Actions, secrets and the Pages settings carry over. Saved settings and classes on phones survive,
because the browser keeps them per site (`antovu.github.io`), which doesn't change. Local folders can keep their
names.

**What it doesn't:** the site moves from `antovu.github.io/cse3311-fall26-group7/` to `antovu.github.io/mavigator/`,
and the old address returns 404 with no redirect. The build has the old path baked in, so the site shows a blank
page at the new address until the code changes.

| Done | Task | Who |
|:---:|---|---|
| ☐ | Prepare a branch with the new path: `app.json` `experiments.baseUrl` to `"/mavigator"`; `start_url` and `scope` in `public/manifest.webmanifest`; `REPORT_REPO_URL` in `src/components/map/map-report.ts` and its test; the README's links; the comment at the top of `.github/workflows/deploy-web.yml`. Run the three checks. | Anthony |
| ☐ | Rename on GitHub (Settings > General > Repository name), then **right away** merge and push that branch to `main`. The deploy rebuilds the site at the new address within minutes. Pushing before the rename breaks the live site until the rename happens. | Anthony |
| ☐ | Open `antovu.github.io/mavigator/` on a phone, and check a deep link (a class route) and a reload. | Anthony |
| ☐ | Point each clone at the new name: `git remote set-url origin https://github.com/AntoVu/mavigator.git`. The old URL keeps working through the redirect; this just avoids surprises. | Everyone |
| ☐ | Re-add the site to the Home Screen on any phone that has it; the old icon points at the 404. | Everyone with it installed |
| ☐ | Use the new address in the final document and slides. Leave the Iteration 1 to 3 deliverables as submitted: their repo links redirect, but their "Live Build" links will 404. | Everyone |
| ☐ | Never create a new repo named `cse3311-fall26-group7`. It takes over the old name and ends the redirect. (It's also the only way to keep the old site address alive, through a page that redirects, so it's a trade-off.) | |
