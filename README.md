# Mavigator

### Vision Statement:
The UTA Campus Map nicknamed "Mavigator" will improve productivity of UTA students. It will reduce the navigation times in the university by automating pathing starting from ideal parking spaces, fastests paths to classes, and reduce confusion of room number labeling. It will be a precise system that PDF maps and other online maps do not have the resources to recreate.

---

CSE-3311 Fall 2026, Team 7. React Native (Expo) app written in TypeScript.

## What works in Iteration 1

| Tab | State |
| --- | --- |
| **Map** | Working. Pan and pinch-zoom a traced map of the campus core (S Cooper St, UTA Blvd, S Center St, W Mitchell St). Tap a building to see its name, category, abbreviation and a preview of its footprint. |
| **Parking** | The same map with buildings grayed out and every lot in a placeholder red ("no permit selected"). Permit-based coloring is still to come. |
| **Schedule** | Stub screens with example data. |
| **Settings** | Stub screens with drill-down navigation. Rows that have nothing behind them yet are shown disabled. |

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
- **Browser:** though expo does support browser, no testing was done in the browser as it was designed to be an phone app.

## Run the tests

```bash
npm test
```

This runs [Jest](https://jestjs.io/) (via `jest-expo`). Unit tests are next to the code they test, in a `__tests__` folder. It currently covers:

| Test file | What it checks |
| --- | --- |
| `src/components/map/__tests__/projection.test.ts` | Latitude/longitude convert to map coordinates correctly: corners, center, north up and east right. |
| `src/components/map/__tests__/map-geometry.test.ts` | Pinch-zoom math: the point under your fingers stays put while zooming, zoom is limited to 0.6x to 4x, and the map can't be dragged past its edge. Also the map's sizing and pan limits. |
| `src/components/map/__tests__/tap-guard.test.ts` | Releasing a drag over a building doesn't open it, but a real tap does. |
| `src/data/__tests__/campus-data.test.ts` | The hand-traced buildings, lots and streets have unique ids, shapes with at least 3 points, and coordinates inside the campus box. Catches a bad export from the Campus Digitizer. |

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

Parking Tab:
1. Buildings are gray and labeled, lots are red, and pan/zoom behave as on the Map tab.

Settings Tab:
1. Your Profile and App Customization buttons appear. Each button opens or is visibly disabled, and the back button works.
2. **Light and dark mode:** switch the phone's theme, all four tabs stay readable.

Iteration 1 was checked by hand on iOS (Expo Go) and in the web build.

## Project layout

| Directory / File | Path | Purpose |
| --- | --- | --- |
| app/ | src/ | Shows the screens, has one folder per screen |
| map/ | src/components/ | The campus map and its gestures |
| parking/ | src/components/ | Parking |
| schedule/ | src/components/ | Schedule |
| settings/ | src/components/ | Settings |
| constants/ | src/ | Campus bounds and map size, colors, and theme
| hooks/ | src/ | Theme and color scheme hooks |
| data/ | src/ | The actual data of hand traced campus map |
| mocks/ | src/ | Placeholder examples of future data |
| types/ | src/ | Data model, points of interest, lots, streets, and node graph
| inception_documents | / | Design documents from inception phase |
| assets/ | / | Icons and images the app uses |


The campus data was traced by hand from satellite imagery with the team's own Campus Digitizer tool. Read the comment at the top of `src/constants/campus.ts` before changing the map bounds: they must match the digitizer's or every shape is misplaced.

## Credits

- Started from the [Expo](https://expo.dev) default template (MIT license, 650 Industries; see [LICENSE](LICENSE)).
- Map drawing uses [react-native-svg](https://github.com/software-mansion/react-native-svg); gestures use [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) and [Reanimated](https://docs.swmansion.com/react-native-reanimated/).
- Building names, abbreviations and the campus layout were cross-referenced with the UT Arlington campus map. Not affiliated with or endorsed by UTA.
- Generative AI (Claude, by Anthropic) was used to assist with code, research and documentation.
