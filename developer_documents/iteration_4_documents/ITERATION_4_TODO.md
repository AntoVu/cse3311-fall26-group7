# Iteration 4: What's Left

Iteration 4 is due **11/15/26** and ends with the final demo. The inception plan gives it "polish, iOS and Android
compatibility testing, final demo". This list collects:
- the Iteration 4 plans in the Iteration 3 deliverable;
- what the Iteration 2 deliverable promised and didn't finish;
- what the risk plans and user feedback still owe;
- what was found while merging Iteration 3.

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
| ☐ | Smooth and fix the jagged auto-traced outlines. The deliverable showed Woolf Hall as the example. The Indoor Digitizer's **Simplify** and **Square to angles** do most of it. | Everyone |
| ☐ | ERB floor 6 (R-04): visit it, check it against the trace, and map it or keep it marked unmapped. The Iteration 3 deliverable promised this for Iteration 4. | Anyone on campus |
| ☐ | Confirm buildings on site, and add objects: vending machines, microwaves, water fountains, refill stations. Spot-check room numbers and stairs in two or three reviewed buildings (R-12). | Everyone |
| ☐ | **(new)** The import report lists entrances that join no walkway and doors more than 10 m from a hallway. Fix them, or trace a walkway in the Campus Digitizer. | Reviewers |
| ☐ | GACB has a diagram for only one of its buildings (R-08). Map the rest by walking it, or leave it routing to the door. | Anyone on campus |

## 2. Features and fixes

| Done | Task | Who |
|:---:|---|---|
| ☐ | Better explain MyMav import: show which page to copy (week view or List View) and where to find it, with a picture or step list on the import screen. | |
| ☐ | Collect more real MyMav pastes from teammates and testers, with names and IDs removed. Add each one as a test in `mymav-parser.test.ts`, and fix what breaks (R-13). | Everyone |
| ☐ | Fine-tune Avoid crowds. Per the deliverable: Monday to Thursday at full strength, lighter on Fridays, off on weekends (**done in code 2026-11-02**: Fridays cost 2x instead of 4x; walking campus is still to do). Walk campus at a few times to confirm the two zones and the 11 AM to 3 PM window. Zones are `CROWD_ZONES` in `src/constants/foot-traffic.ts`. | |
| ☐ | Make sure every parking rule is right. Ask PATS: may Reduced Rate and Remote Park & Ride park in commuter lots after 1 PM? Are the Lot 36 and Lot 49 upgrades limited to their zones? May anyone park in staff lots after 7 PM, on weekends, and before 7 AM? Update `parking-permits.ts` and its tests. | |
| ☐ | Issue #18: permit rules for Lots 28, 39, 46, ADAN and the visitor lots. | |
| ☐ | Fix building names. Check the map's names and abbreviations against UTA's own list. | |
| ☐ | **(new)** Find out what Anthony's note "THE LATITUDE AND LONGITUDE ARE WRONG" means (`Claude outputs/CONFIRMATIONS_NEEDED.md`), and fix it or delete it. | Anthony |
| ☐ | Blaine's feedback: Lot 49 to ERB goes down Cooper instead of the path students use. Trace the missing walkway in the Campus Digitizer and re-import. | |
| ☐ | Schedule: Edit should let you change a class, not only delete it (Iteration 2). | |
| ☐ | Schedule: center the day-of-the-week buttons (Iteration 2). | |
| ☐ | Schedule: start and end time buttons go off screen on iOS (Iteration 2). | |
| ☐ | Building preview: one-finger panning on the indoor view doesn't work until a pinch starts (Iteration 2). | |
| ☐ | Building preview: it takes too much of the screen; collapse it unless opened (Iteration 2). | |
| ☐ | Parking tab: decide whether to fold it into the Map tab and add a Navigation tab (Iteration 2). Big change: decide early or drop it. | Team decision |
| ☐ | **(new)** Staff route toggle: a Settings switch that lets staff route through keycard doors. The data and the router already support it; see `Claude outputs/PLANNED_FEATURES.md`. Optional. | |
| ☐ | Andy and Daniel: starting a route is confusing. Watch someone new route to a class, note where they get stuck, and fix those spots. | |
| ☐ | UI updates for looks. Steven called the UI "janky". Go screen by screen on a phone. | |

## 3. Website and bugs

| Done | Task | Who |
|:---:|---|---|
| ☑ | **(new)** React error #418 (R-11): the route and indoor screens opened from the Map tab log a hydration warning on first load. The page still works. Find what renders differently from the build (likely the query string) and wait for `useHasHydrated()`. | Anthony |
| ☑ | **(new)** Reloading an indoor or Map-tab route URL on the live site hits the 404 fallback, which is the class route page. Make the fallback handle `/map/route` and the indoor pages, or send them back to the map. | |
| ☐ | **(new)** Test on real phones: iPhone Safari and Android Chrome. Check pinch and pan, the long-press pin, the GPS prompt on campus, the time picker, Add to Home Screen, and the strip under the tab bar (fixed but never seen on an iPhone). | Everyone with a phone |
| ☐ | **(new)** Check load time on cellular data on the live site, not through the tunnel. | |
| ☐ | Maybe: move off GitHub Pages for a nicer URL (the Iteration 3 deliverable mentions it). Optional. | |

## 4. Code and repo cleanup

| Done | Task | Who |
|:---:|---|---|
| ☑ | Static analysis fixes: 494 problems from typescript-eslint's strict rules (`developer_documents/STATIC_ANALYSIS.md`). At least the four analyzed: W1 floating promise (`use-device-location.ts`), W2 enum compare (`Location.PermissionStatus.GRANTED`), W3 promise passed to `onPress` (`schedule/index.tsx`), and W4 (a false positive: suppress it with a comment). Then the next riskiest rules. | Anthony |
| ☐ | **(new)** Before the final demo, remove Settings > Developer: `src/app/settings/developer.tsx`, its row, `state/dev-clock.ts`, `components/settings/developer-tools.ts` and `room-picker.tsx`. Keep `components/ui/chip.tsx`. Update the README's Avoid crowds test step, which uses the Developer clock. | Anthony |
| ☑ | Clean up junk in the repo: `routes.txt` (empty), `Iteration 3 (Written Deliverable) DRAFT.md` (now that the submitted one is in), and the stale `RISK_ASSESSMENT.md` and `DEVELOPMENT_PLAN.md` in `inception_documents/`. | |
| ☐ | **(new)** Delete merged branches on GitHub: about 30 old feature and review branches. | Anthony |
| ☐ | **(new)** Check whether react-native-svg still adds the Responder props; if it stopped, delete `src/components/map/quiet-svg-responder-warning.ts`. | |
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
