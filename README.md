# Mavigator

### Vision Statement:
The UTA Campus Map nicknamed "Mavigator" will improve productivity of UTA students. It will reduce the navigation times in the university by automating pathing starting from ideal parking spaces, fastests paths to classes, and reduce confusion of room number labeling. It will be a precise system that PDF maps and other online maps do not have the resources to recreate.

---

CSE-3311 Fall 2026, Team 7. React Native (Expo) app written in TypeScript.

## What works in Iteration 1

| Tab | State |
| --- | --- |
| **Map** | Working. Pan and pinch-zoom a traced map of the campus core (S Cooper St, UTA Blvd, S Center St, W Mitchell St). Tap a building to see its name, category, abbreviation and a preview of its footprint. |
| **Schedule** | Working. Classes are listed in time order and marked from the phone's clock: a green check when done, a green glow while in progress, a yellow glow for the next class. Add a class with "+ Add Class" and remove one from its class screen. Tapping a class opens a placeholder for the route preview. Starts with three example classes. |
| **Parking** | The same map with buildings grayed out and each lot colored for the selected parking permit: green is allowed, red is not allowed, yellow is a commuter lot that opens at 1 PM. Pick one of nine permits (or None) from the "Selected Pass" button at the top. Colors follow the phone's clock, since every lot opens to every permit on weekends and after 7 PM. |
| **Settings** | Your Profile has the manual schedule form, a class list to remove from, and Parking Permit. App Customization has a working Theme (System, Light, Dark). Time Standard and Measurement Units screens open but do not change anything yet. Rows that have nothing behind them yet (On-Campus Residence, Import MyMav) are shown disabled. |

Settings are kept for the current session only, so the schedule, permit and theme reset when the app restarts.

Routing, indoor navigation and MyMav schedule import are planned for later iterations.

## Run the app

You need [Node.js](https://nodejs.org/) (v24 was used to develop it) and, to run it on a phone, the **Expo Go** app from the App Store or Google Play.

Please note that if tunnel does not work, you may need to sign in to an account on both your phone and the CLI used to host the app.
```bash
git clone https://github.com/AntoVu/cse3311-fall26-group7.git
cd cse3311-fall26-group7
npm install
npx expo login
npx expo start --tunnel
```

In the terminal that opens:

- **Phone:** scan the QR code. If not using `--tunnel` flag, both devices need to be on the same network.
- **Browser:** Expo can also open the app in a browser and the tabs were checked there early in Iteration 1, but the app is designed for a phone, so use a phone as the reference.

## Run the tests

```bash
npm test
```

This runs [Jest](https://jestjs.io/) (via `jest-expo`). Unit tests are next to the code they test, in a `__tests__` folder. There are 12 test files and 151 tests. It currently covers:

| Test file | What it checks |
| --- | --- |
| `src/components/map/__tests__/projection.test.ts` | Latitude/longitude convert to map coordinates correctly: corners, center, north up and east right. |
| `src/components/map/__tests__/map-geometry.test.ts` | Pinch-zoom math: the point under your fingers stays put while zooming, zoom is limited to 0.6x to 4x, and the map can't be dragged past its edge. Also the map's sizing and pan limits. |
| `src/components/map/__tests__/map-viewport.test.ts` | The saved map view: zoom and position carry over between the Map and Parking tabs, stay inside the allowed limits, and start fitted to the traced campus. |
| `src/components/map/__tests__/tap-guard.test.ts` | Releasing a drag over a building doesn't open it, but a real tap does. |
| `src/data/__tests__/campus-data.test.ts` | The hand-traced buildings, lots and streets have unique ids, shapes with at least 3 points, and coordinates inside the campus box. Catches a bad export from the Campus Digitizer. |
| `src/constants/__tests__/parking-permits.test.ts` | Which lots each of the nine permits may use, with no permit selected everything is restricted, the 1 PM commuter switch, and the weekend and after 7 PM opening. Every lot drawn on the map has a rule. |
| `src/components/parking/__tests__/parking-permit-options.test.tsx` | The permit choices and the pull-up sheet on the Parking tab. The sheet and Settings stay in sync through the same saved choice. |
| `src/context/__tests__/schedule-context.test.tsx` | Schedule logic: time parsing, chronological order, adding and removing classes, and marking each class done, upcoming or normal at different times of day. |
| `src/components/schedule/__tests__/class-list-item.test.tsx` | The class card: flag colors, "In progress" and "Upcoming class" never showing together, the done check, and the status glow. |
| `src/components/schedule/__tests__/manual-add-class-form.test.tsx` | The Add Class form shows every field, and its pull-up sheet opens and closes. |
| `src/components/settings/__tests__/time-format.test.ts` | The time picker text: 5 minute steps, 12-hour format including noon and midnight, and rejecting text that is not a time. |
| `src/state/__tests__/state.test.ts` | The shared settings: the permit starts as None and the theme starts by following the device, and changes reach every screen using them. |

Before merging, we check:

```bash
npx tsc --noEmit   # type check
npm run lint       # eslint
```

### Manual test checklist

Run on a real phone, behavior will not work as intended in browser.

Map Tab:
1. Map appears with labels, academic buildings in blue, on campus residence in green, nearby apartments in orange, and parking lots in gray.
2. **Pan:** drag the map with one finger. It moves and stops at the campus edges.
3. **Pinch-zoom:** put two fingers on different parts of the map and spread them. The map zooms toward the point between your fingers. Lift one finger slightly before the other: the map should not snap.
4. **Drag then release over a building:** the details sheet should not open.
5. **Tap a building:** the details sheet opens, showing its name, category, abbreviation and a render of the building on a dark background. Tap the dark area to close it.

Schedule Tab:
1. The three example classes appear in time order (9:00 AM, 2:00 PM, 4:00 PM), each with a colored flag on the left, its course code and name, building and room, and times.
2. **Status follows the clock:** a finished class shows a green check, the class happening now shows "In progress" with a green glow, and the next class shows "Upcoming class" with the minutes until it starts and a yellow glow. Check once during a class (for example 2:30 PM) and once in the evening, when all three should be done.
3. **Add a class:** tap "+ Add Class", fill every field and save. The class appears in its correct time position. Leaving any field empty shows "Please fill in all fields."
4. **Remove a class:** tap a class to open it, tap Remove in the header and confirm. You return to the list and the class is gone.

Parking Tab:
1. Buildings are gray and labeled, and pan/zoom behave as on the Map tab. Zoom in on a lot on the Map tab, switch to Parking, and the map shows the same place.
2. With no permit ("Selected Pass: None") every lot is red.
3. **Pick a permit:** tap "Selected Pass", choose one (for example East Commuter) and close the sheet. Its lots turn green, and the rest are red. On a weekday before 1 PM the other commuter lots are yellow ("Opens at 1 PM"), and on weekends or after 7 PM every lot is green.
4. **Same choice in Settings:** open Settings, then Your Profile, then Parking Permit. The permit you picked is checked, and picking a different one there changes the Parking tab.

Settings Tab:
1. Your Profile and App Customization buttons appear. Each button opens or is visibly disabled, and the back button works.
2. **Your Profile, Schedule:** the same form as the Schedule tab's "+ Add Class", and a "My Classes" list. Adding or removing a class here shows up on the Schedule tab.
3. **Theme:** choose Light, then Dark, then System. All four tabs change and stay readable. System follows the phone's theme.

Iteration 1's Map tab was checked by hand on iOS (Expo Go) and in the web build. The Schedule, Parking and Settings features were checked with the automated tests above and by building the iOS, Android and web bundles. **The checklist above still needs a pass on a physical phone** for the time picker, status glows, tab icons and pull-up sheets.

## Known limitations

- Nothing is saved between app launches yet.
- The Add Class form only checks that every field is filled in. It does not yet check that the end time is after the start time, or that the building and room exist on the map.
- Parking colors show which lots a permit may use right now, not whether a lot has spaces. UTA does not publish that data, so predicting how full a lot is comes later.
- The permit rules are our simplified reading of UTA's parking map and are not official. Confirm with UTA Parking and Transportation Services before relying on them.
- Some lots (for example Lots 25 to 27, 29, 30, 34, 35 and 49 to 53) have rules but are not traced on the map yet, so they are not drawn.
- Time Standard (12/24-hour) and Measurement Units change nothing yet.

## Project layout

| Directory / File | Path | Purpose |
| --- | --- | --- |
| app/ | src/ | Shows the screens, has one folder per screen |
| map/ | src/components/ | The campus map and its gestures |
| parking/ | src/components/ | Parking permit choices and the pull-up sheet |
| schedule/ | src/components/ | Schedule class cards and the Add Class form |
| settings/ | src/components/ | Settings rows, time picker and time formatting |
| ui/ | src/components/ | Shared pieces: the pull-up sheet and the pick-one row |
| constants/ | src/ | Campus bounds and map size, colors, theme, parking permit rules, and schedule colors |
| context/ | src/ | The schedule shared by the Schedule and Settings tabs |
| state/ | src/ | Shared settings: selected parking permit and theme |
| hooks/ | src/ | Theme and color scheme hooks |
| data/ | src/ | The actual data of hand traced campus map |
| mocks/ | src/ | The three example classes the schedule starts with |
| types/ | src/ | Data model, points of interest, lots, streets, and node graph |
| inception_documents | / | Design documents from inception phase |
| assets/ | / | Icons and images the app uses |


The campus data was traced by hand from satellite imagery with the team's own Campus Digitizer tool. Read the comment at the top of `src/constants/campus.ts` before changing the map bounds: they must match the digitizer's or every shape is misplaced.

## Credits

- Started from the [Expo](https://expo.dev) default template (MIT license, 650 Industries; see [LICENSE](LICENSE)).
- Map drawing uses [react-native-svg](https://github.com/software-mansion/react-native-svg); gestures use [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) and [Reanimated](https://docs.swmansion.com/react-native-reanimated/). The class time picker uses [@react-native-community/datetimepicker](https://github.com/react-native-datetimepicker/datetimepicker).
- Building names, abbreviations and the campus layout were cross-referenced with the UT Arlington campus map. Not affiliated with or endorsed by UTA.
- Parking permit zones and lot access were read from UTA Parking and Transportation Services' [Student Commuter Zones Parking Map](https://www.uta.edu/pats/news/2025/Student-Commuter-Zones-Parking-Map---20262.pdf).
- Generative AI (Claude, by Anthropic) was used to assist with code, research and documentation.
