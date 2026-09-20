# Mavigator

### Vision Statement:
The UTA Campus Map nicknamed "Mavigator" will improve productivity of UTA students. It will reduce the navigation times in the university by automating pathing starting from ideal parking spaces, fastests paths to classes, and reduce confusion of room number labeling. It will be a precise system that PDF maps and other online maps do not have the resources to recreate.

---

CSE 3311 Fall 2026, Team 7. A React Native (Expo) app written in TypeScript. Design documents are in [`inception_documents/`](inception_documents/).

## What works in Iteration 1

| Tab | State |
| --- | --- |
| **Map** | Working. Pan and pinch-zoom a traced map of the campus core (S Cooper St, UTA Blvd, S Center St, W Mitchell St). Tap a building to see its name, category, abbreviation and a preview of its footprint. |
| **Parking** | The same map with buildings grayed out and every lot in a placeholder red ("no permit selected"). Permit-based colouring is still to come. |
| **Schedule** | Stub screens with example data. |
| **Settings** | Stub screens with drill-down navigation. Rows that have nothing behind them yet are shown disabled. |

Routing, indoor navigation and MyMav schedule import are planned for later iterations.

## Run the app

You need a recent LTS of [Node.js](https://nodejs.org/) (v24 was used to develop it) and, to run it on a phone, the **Expo Go** app from the App Store or Google Play.

```bash
git clone https://github.com/AntoVu/cse3311-fall26-group7.git
cd cse3311-fall26-group7
npm install
npx expo start
```

Then, in the terminal that `expo start` opens:

- **Phone:** scan the QR code with the Camera app (iOS) or Expo Go (Android). The phone and computer must be on the same Wi-Fi. If they can't see each other (campus Wi-Fi often blocks this), run `npx expo start --tunnel` instead.
- **Browser:** press `w` (or run `npm run web`). Pan with the mouse; pinch-zoom works best on a touch device.
- **Emulators:** press `i` (iOS Simulator, macOS only) or `a` (Android emulator).

## Run the tests

```bash
npm test
```

This runs the [Jest](https://jestjs.io/) suite (via `jest-expo`). It has no UI and needs no device or emulator. Unit tests sit next to the code they test, in a `__tests__/` folder (e.g. `src/components/map/__tests__/`). If integration or end-to-end tests are added, they will go in a top-level `tests/` folder. It currently covers:

| Test file | What it checks |
| --- | --- |
| `src/components/map/__tests__/projection.test.ts` | Latitude/longitude convert to map coordinates correctly: corners, centre, north up and east right. |
| `src/components/map/__tests__/map-geometry.test.ts` | Pinch-zoom math: the point under your fingers stays put while zooming, zoom is limited to 0.6x to 4x, and the map can't be dragged past its edge. Also the map's sizing and pan limits. |
| `src/components/map/__tests__/tap-guard.test.ts` | Releasing a drag over a building doesn't open it, but a real tap does. |
| `src/data/__tests__/campus-data.test.ts` | The hand-traced buildings, lots and streets have unique ids, shapes with at least 3 points, and coordinates inside the campus box. Catches a bad export from the Campus Digitizer. |

Two more checks the team runs before merging:

```bash
npx tsc --noEmit   # type check
npm run lint       # eslint
```

### Manual test checklist (things automated tests can't see)

Run on a real phone, since gestures behave differently there than in the browser.

1. **Pan:** drag the map with one finger. It moves and stops at the campus edges.
2. **Pinch-zoom:** put two fingers on different parts of the map and spread them. The map zooms toward the point between your fingers. Lift one finger slightly before the other: the map must not jump.
3. **Drag then release over a building:** the details sheet must **not** open.
4. **Tap a building:** the sheet opens, showing its name, category, abbreviation and a footprint preview on a dark background. Tap the dark area to close it.
5. **Parking tab:** buildings are gray and labelled, lots are red, the legend is visible, and pan/zoom behave as on the Map tab.
6. **Schedule and Settings:** each row opens or is visibly disabled, and the back button works.
7. **Light and dark mode:** switch the phone's theme; all four tabs stay readable.

Iteration 1 was checked by hand on iOS (Expo Go) and in the web build.

## Project layout

```
src/
  app/          Screens. One folder per tab (map, schedule, parking, settings), Expo Router file-based routing.
  components/   map/ (the campus map and its gestures), parking/, schedule/, settings/, shared UI.
  constants/    Campus bounds and map size, parking colours, theme.
  hooks/        Theme and colour-scheme hooks.
  data/         The real, hand-traced campus map data (buildings, lots, streets). Permanent.
  mocks/        Placeholder example data (schedule, parking) to be replaced as those features are built.
  types/        Data model: points of interest, lots, streets, and the node/edge/route graph types.
inception_documents/   Design documents from the inception phase.
CLAUDE.md              Detailed engineering notes (why the map is built the way it is).
```

The campus data was traced by hand from satellite imagery with the team's own Campus Digitizer tool. Read the comment at the top of `src/constants/campus.ts` before changing the map bounds: they must match the digitizer's or every shape is misplaced.

## Credits

- Started from the [Expo](https://expo.dev) default template (MIT license, 650 Industries; see [LICENSE](LICENSE)).
- Map drawing uses [react-native-svg](https://github.com/software-mansion/react-native-svg); gestures use [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) and [Reanimated](https://docs.swmansion.com/react-native-reanimated/).
- Building names, abbreviations and the campus layout were cross-referenced with the UT Arlington campus map. Not affiliated with or endorsed by UTA.
- Generative AI (Claude, by Anthropic) was used to assist with code, research and documentation.
