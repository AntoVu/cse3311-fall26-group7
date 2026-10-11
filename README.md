# Mavigator

### Vision Statement:
The UTA Campus Map nicknamed "Mavigator" will improve productivity of UTA students. It will reduce navigation time across the university by automating pathfinding starting from ideal parking spaces, fastest paths to classes, and reduce confusion of room number labeling. It will be a precise system that PDF maps and other online maps do not have the resources to recreate.

---

CSE-3311 Fall 2026, Team 7. Written in TypeScript with React Native and Expo, and **shipped as a mobile website**.

**Live site: https://antovu.github.io/cse3311-fall26-group7/**

## A website first

Since Iteration 2, Mavigator is designed for, tested in and deployed to **phone browsers**. Publishing to the App Store costs $99 a year and needs a Mac or a paid build service, and the review cycle would slow us down (risk R-03). The website needs neither, and it updates for everyone the moment a change is merged into `main`.

- **Open it** in Safari or Chrome on your phone.
- **Add it to your Home Screen** (Safari: Share, then Add to Home Screen) to open it full screen like an app, with its own icon.
- **GPS needs HTTPS.** The live site has it. Off campus, long-press the map to drop a pin and use it as your location.

The code still builds for iOS and Android, but those builds are no longer tested.

## What works in Iteration 2

| Screen | State |
| --- | --- |
| **Map** | The whole campus and nearby apartments, from OpenStreetMap: 93 buildings, 61 parking lots, streets and every walkway. Pan and pinch-zoom. Tap a building for its name, category and abbreviation. Traced buildings (Nedderman Hall, Engineering Research Building) have an **Inside** view in that popup: switch floors, tap a room, and **Set Room ___ as destination**. Long-press to drop a pin. |
| **Routes** | One route screen for every destination, whether a class, a building or a room. Pick a starting point (your location, a residence hall, an apartment or a parking lot), choose **Walk** or **Bike**, and get the distance, the time and turn-by-turn directions. The start building lights up green and the destination is marked with a red pin. |
| **Indoor navigation** | **Go inside** on a route opens the building's floor plan with the walk to the room, floor by floor: stairs and elevators, "Room 228 is on your left", and tap a step to see its floor. Routes stay in hallways and go through a room only when that is the only way in, such as an inner office. |
| **Schedule** | Classes have days of the week. A Su–Sa row shows one day's classes and opens on today. On today's list, cards show a green check when done, "In progress" with a green glow, and the next class with a yellow glow. Add a class with "+ Add class": the form needs at least one day and asks before adding a class that overlaps another, or a room that isn't on the building's indoor map. Remove classes with **Edit**. Tap a class for its route. |
| **Parking** | The same map, with each lot colored for your parking pass: green allowed, red not allowed, yellow opens at 1 PM. There are ten passes, nine student permits plus Faculty/Staff. A drawer recommends the three best lots for your next class today, ranked by walking time, and tapping one draws the walk. |
| **Settings** | Your Profile (schedule, parking permit), Theme (System/Light/Dark), Time Standard (12/24-hour), Measurement Units (Imperial/Metric), About, and Developer, temporary test tools that are removed before the final demo. Every setting applies across the whole app. |

**Saved in your browser:** the schedule, parking permit, theme, starting point, distance units and time format all survive a reload.

## Run it locally

You need [Node.js](https://nodejs.org/) (v24 was used to develop it).

```bash
git clone https://github.com/AntoVu/cse3311-fall26-group7.git
cd cse3311-fall26-group7
npm install
npx expo start --web
```

Open `http://localhost:8081/map`. In desktop Chrome, open the developer tools (F12) and turn on the device toolbar to see it at phone size.

**On your phone before deploying:** run `npx expo start --web --tunnel` and open the link it prints. Over your home Wi-Fi without the tunnel the page loads, but GPS won't, because it isn't HTTPS. You may need `npx expo login` first.

**Deploying:** every push to `main` runs `.github/workflows/deploy-web.yml`. It type-checks, runs the tests, builds the site with `npx expo export --platform web`, and publishes it to GitHub Pages.

## Run the tests

```bash
npm test           # Jest: 36 test files, 506 tests
npx tsc --noEmit   # type check
npx expo lint      # eslint
```

All three should report no problems before a merge. Unit tests sit next to the code they test, in a `__tests__` folder.

| Area | What the tests check |
| --- | --- |
| Routing (`src/routing/`) | Distances, the walkway graph, Dijkstra, real campus routes with believable distances and ETAs, walking and biking times, starting points, splitting a route at the building door, floors, room lookup, text directions (indoors too), parking recommendations, and distance formatting in both units. |
| Map (`src/components/map/`) | Latitude/longitude to map coordinates, pinch-zoom math, the saved map view shared by the Map and Parking tabs, the legend, and that releasing a drag doesn't count as a tap. |
| Schedule (`src/context/`, `src/components/schedule/`) | Time parsing, order, days of the week, today's statuses, overlap and validation checks, the class card and the Add Class form. |
| Parking (`src/constants/`) | What each pass may use and when: the 1 PM commuter switch, evenings and weekends, the Faculty/Staff lots, and that every lot on the map has a rule or is shown as unknown. |
| Settings and saving (`src/state/`, `src/components/settings/`) | The shared settings, saving to and loading from the browser (including corrupt saved data), and time formatting. |
| Map data (`src/data/`, `tools/`) | The generated campus data is valid and routable, every traced floor stays connected, and the OpenStreetMap and indoor import rules work. |

### Manual test checklist (on a phone)

1. **Map:** pan, pinch, tap a building. On Nedderman Hall, choose **Inside**, change floors, tap a room, then **Set Room ___ as destination**.
2. **Route:** pick a start with the "From ___" chip. Switch Walk and Bike, open the directions, then **Go inside** and step through the floors. Back returns to where you came from.
3. **Schedule:** the day row opens on today. Add a class on two days and check that it shows on both. Add one that overlaps another and confirm the warning. Remove classes with Edit.
4. **Parking:** pick a pass. The lots change color. Open the drawer and tap a lot to see its walk.
5. **Settings:** switch Theme, Time Standard and Measurement Units and check that each changes the other screens. Reload the page and check that they stay.
6. **Home Screen app:** add it to your Home Screen, open it, and check that it fills the screen with no strip under the tab bar.

## Known limitations

- **Indoor maps:** only Nedderman Hall and the Engineering Research Building are traced. Woolf Hall is next, and the buildings east of Cooper St follow in Iteration 2.5. Other buildings route to their nearest door.
- **Parking:** colors show where a pass may park, not whether a lot has spaces. UTA doesn't publish occupancy data. The rules are our reading of the PATS parking map, not official, and the Faculty/Staff lots are an assumption. A few lots have no rule yet and stay gray.
- **Saving:** settings and the schedule are saved in the browser you use, so they don't follow you to another phone.
- **Not built yet:** avoiding busy areas (Iteration 2.5) and importing a MyMav schedule (Iteration 3).
- **Testing:** the site has been tested in an emulated phone browser. A full pass on a real iPhone and Android phone is still to do.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app/` | The screens, one folder per tab (`map/`, `schedule/`, `parking/`, `settings/`). `+html.tsx` is the page the website loads into. |
| `src/components/` | UI by area: `map/` (campus and indoor maps, gestures), `routing/` (the shared route and indoor screens, directions, start picker), `schedule/`, `parking/`, `settings/`, and `ui/` (shared pieces such as the pull-up sheet, option rows and chips). |
| `src/hooks/` | `usePlaceRoute`, the one place routes are worked out for every tab, plus theme and location hooks. |
| `src/routing/` | The navigation engine: geometry, the walkway graph, Dijkstra, ETAs, directions, floors, starting points and parking recommendations. |
| `src/data/` | Campus and indoor map data. Mostly generated; see below. |
| `src/context/`, `src/state/` | The schedule, and the shared settings with browser saving. |
| `src/constants/` | Colors, theme, campus bounds, building categories and parking permit rules. |
| `tools/osm/`, `tools/indoor/` | Import scripts that generate `src/data/` from OpenStreetMap and the indoor tracing. |
| `public/` | Website files: the web app manifest and icons. |
| `developer_documents/` | Inception and iteration documents. |

### Where the map data comes from

`npm run import:osm` rebuilds everything in `src/data/` from OpenStreetMap plus three hand-maintained inputs that it never overwrites:
- `map-labels.ts`: names, abbreviations and lot numbers;
- `map-edits.json`: from our Campus Digitizer tool, which names, reshapes and traces places over UTA's parking map;
- `indoor-edits.json`: from our Indoor Digitizer, the hallways, doors, stairs and rooms traced over UTA's evacuation floor plans. Only the traced graph is in this repository, never the plans themselves.

Iteration 1's hand-traced map was a median 865 ft out of place because of a calibration mistake, so Iteration 1.5 replaced it with OpenStreetMap.

## Credits

- Started from the [Expo](https://expo.dev) default template (MIT license, 650 Industries; see [LICENSE](LICENSE)).
- Maps are drawn with [react-native-svg](https://github.com/software-mansion/react-native-svg). Gestures use [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) and [Reanimated](https://docs.swmansion.com/react-native-reanimated/). The native time picker uses [@react-native-community/datetimepicker](https://github.com/react-native-datetimepicker/datetimepicker).
- Map data is © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, made available under the [Open Database License](https://opendatacommons.org/licenses/odbl/). The files generated from it under `src/data/` are a derived database under the same license; the rest of this repository keeps its own license. The app credits this in Settings > About.
- Indoor routes were traced from UT Arlington's building evacuation diagrams (Environmental Health & Safety). The diagrams themselves are not included.
- Building names, abbreviations and the campus layout were cross-referenced with the UT Arlington campus map. Not affiliated with or endorsed by UTA.
- Parking permit zones and lot access were read from UTA Parking and Transportation Services' [Student Commuter Zones Parking Map](https://www.uta.edu/pats/news/2025/Student-Commuter-Zones-Parking-Map---20262.pdf).
- Generative AI (Claude, by Anthropic) was used to assist with code, research and documentation.
