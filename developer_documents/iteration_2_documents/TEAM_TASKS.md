# Iteration 2 Roles

Please have done by Saturday, I want to submit the work early and enjoy my Sunday.

## Process

1. Pull `main` and make a branch: `git checkout -b <your-name>/<task>`. You could also reuse your old branch but be sure to pull from main.
2. Make the change and test it to make sure it works as you expected it.
3. Run all three and get 0 problems: `npx tsc --noEmit`, `npx expo lint`, `npm test`.
4. Open a pull request.

To see your change, run `npx expo start --web` and open `http://localhost:8081/map`. Open the developer console (F12) and click the toggle device toolbar to simulate what it would look like on your phone. You can also visit the website on your phone by running `npx expo start --web --tunnel` and visiting the provided link or scanning the QR code.

## Non-coding tasks

| Done | Task | How to do it | Done when |
|:---:|---|---|---|
| No | Phone test the live site. Find bugs | Open `https://antovu.github.io/cse3311-fall26-group7/` in your web browser on your phone. Play around for a while and try to use every feature. | Make a GitHub issue for every bug you encounter alongside screenshots. |

## Coding tasks

| Done | Task | Assignee | How to do it | Done when |
|:---:|---|---|---|---|
| No | Permit rules: faculty lots |  | In `src/constants/parking-permits.ts`, add `lot-f5`, `lot-f6`, `lot-f7`, `lot-f8`, `lot-f9`, `lot-f17` to `PARKING_LOT_IDS` and give each `'other'` in `LOT_KIND`, exactly like `lotF14`. | A test in `src/constants/__tests__/parking-permits.test.ts` shows a commuter is restricted from one of them at 10 AM on a weekday and allowed at 8 PM. The lots turn red instead of gray on the Parking tab. |
| No | Permit rules: Lots 28, 39, 46, ADAN, visitor lots |  | Look up each lot's zone in the PATS PDF and add it the same way, picking the matching `LotKind` (`westCommuter`, `eastCommuter`, ...). A pay or visitor lot no student permit covers is `'other'`. Ids are `lot-28`, `lot-39`, `lot-46`, `lot-adan`, `lot-visitor-1/2/3`. Leave the apartment lots and West Campus Garage alone. | One new test per lot kind used (e.g. "West Commuter may park in Lot 28 at 10 AM"). Those lots are colored on the Parking tab. |
| No | Make Measurement Units work |  | 1. Copy `src/state/parking-permit.ts` to `src/state/distance-unit.ts` (a store holding `'imperial'` or `'metric'`). 2. In `src/app/settings/measurement-units.tsx`, replace `useState` with that store and cut the choices to Imperial / Metric. 3. Give `formatDistance` in `src/routing/format.ts` a `unit` parameter: metric shows meters under 400 m, then kilometers. 4. Pass the unit from its two callers: `src/app/schedule/route/[classId].tsx` and `src/components/parking/parking-recommendation-card.tsx`. | `src/routing/__tests__/format.test.ts` has metric cases (300 m reads "300 m", 1,500 m reads "1.5 km"). Changing the setting changes the distance on a class's route screen. |
| No | Make 12/24-hour time work |  | 1. Make a store `src/state/time-format.ts` the same way (`'12-hour'` or `'24-hour'`). 2. Point `src/app/settings/time-standard.tsx` at it and delete the time-zone list (campus is in Central time). 3. Give `formatTime` in `src/components/settings/time-format.ts` a format parameter. 4. Classes store times as text like "1:30 PM", so in `src/components/schedule/class-list-item.tsx` show each time as `formatTime(parseTime(text), format)` (keep the text if `parseTime` returns null). | `src/components/settings/__tests__/time-format.test.ts` has 24-hour cases (870 minutes reads "14:30"). The Schedule tab switches format when the setting changes. |
| No | Use the shared confirm dialog |  | In `src/app/settings/profile/schedule.tsx`, replace the `Platform.OS === 'web'` / `Alert.alert` block with `confirmAction` from `src/components/ui/alert.ts`. | Removing a class in Settings > Profile > Schedule still asks first, on web. |
| No | Persistent save | | The schedule, parking permit, theme and start point survive a page reload. The site is pre-built, then loaded in the browser. If anything reads saved data while the page first renders, React throws the page away. So never read `localStorage` inside a store's initial value or a `useState` initializer. | Appropriate test files for persistent save written and specified values survive page reload. |

## Proposed solutions

Starting points, not requirements. If you find a better fix, use it.

### Coding tasks above

- **Faculty lots:** `src/constants/parking-permits.ts`. Add each id to `PARKING_LOT_IDS` and give it `'other'` in `LOT_KIND`. The test calls `getParkingPermission` with a commuter permit and a weekday `now` at 10:00 (`restricted`) and at 20:00 (`allowed`).
- **Lots 28, 39, 46, ADAN, visitor:** same file and pattern. Read each zone off the PATS PDF. Copy an existing commuter-lot test for each new kind.
- **Measurement Units:** `src/state/distance-unit.ts` (copy `parking-permit.ts`). Give `formatDistance(meters, unit = 'imperial')` in `src/routing/format.ts` a default so existing callers and tests keep passing. The two callers pass `useDistanceUnit()`.
- **12/24-hour time:** `src/state/time-format.ts`. Give `formatTime(minutes, format = '12-hour')` in `src/components/settings/time-format.ts` a default the same way. `class-list-item.tsx` uses `parseTime` from the same file.
- **Shared confirm dialog:** `src/app/settings/profile/schedule.tsx`, `handleRemoveClass` (around line 41). Make it `async` and replace the whole `if/else` with `if (await confirmAction('Remove Class', message, 'Remove')) removeClass(id)`, then delete the unused `Alert` import (keep `Platform`, which line 30 still uses).
- **Persistent save:** new `src/state/persist.ts` with `persist(store, key)`. It reads `localStorage` (inside try/catch) and calls `store.set`, then subscribes to write every change. Call it for the permit, theme and start-point stores from a `useEffect` in `src/app/_layout.tsx` that waits for `useHasHydrated()`, never earlier. For the schedule, `ScheduleProvider` (`src/context/schedule-context.tsx`) does the same in its own effect. On load, drop saved classes whose `buildingId` is no longer in `CAMPUS_POIS`. Web only: on native, `localStorage` is undefined and the try/catch makes it a no-op. Tests: save, reload into a fresh store, and handle corrupt JSON or a missing key.

### New issues (found 2026-10-05 phone testing)

| Issue | Where | Proposed fix |
|---|---|---|
| Tab bar icons don't change color on tab change (only Map is highlighted) | `src/components/app-tabs.web.tsx` | On web, `tintColor` is a CSS `filter: url(#tint-N)` pointing at a hidden SVG filter. The filter's color does update (checked in desktop Chrome), so the phone browser is most likely not repainting the changed filter (a known Safari problem). Map is right only because it starts focused. Quick fix: `key={isFocused ? 'on' : 'off'}` on the `<Image>` forces a fresh element. Better fix: see the next row. |
| Tab bar icons are blurry | `assets/images/tabIcons/`, `app-tabs.web.tsx` | Web only ever loads the 24 px 1x PNG (confirmed on the live site), so a 3x phone screen stretches it. Either `require` the `@3x` file on web and keep the 24x24 style, or redraw the 4 icons as small `react-native-svg` components that take a `color` prop. The SVG route fixes this row and the previous one, with no tint filter. |
| "Set as destination" does nothing | `src/components/map/poi-info-sheet.tsx:34` | It is a `disabled` stub. Add an `onSetDestination(poi)` prop. In `src/app/map/index.tsx`, store the POI, run `findRoute(campusGraph, start, poi.coordinate)` with the start from `resolveStartPoint`/`useUserLocation` (as `schedule/route/[classId].tsx` does), pass `route={plan?.path}` to `CampusMapView`, and show distance and ETA plus a Clear button. With no start point, say so and tell the user to set one or long-press the map. |
| Some building names are wrong (from OSM) | `src/data/map-edits.json` via the Campus Digitizer | Don't edit `campus-pois.ts` (it's generated). Rename the building in the Campus Digitizer, save `map-edits.json`, then run `npm run import:osm` and `npm test`. Small fixes can go in `src/data/map-labels.ts`. A rename changes the POI id (`<category>-<slug>`): check `CAMPUS_CORE_POI_IDS` and `MOCK_SCHEDULE` `buildingId`s (the tests flag both). Fixing the name in OSM itself also helps everyone. |
| Buttons and cards cover too much of the map | `src/app/parking/index.tsx`, `src/components/parking/parking-recommendation-card.tsx`, `src/components/map/map-legend.tsx`, `src/app/map/index.tsx` | Pick one or combine: (a) **collapse the legend** into a small "Legend" chip that expands on tap (one change in `LegendBox`; both tabs get it). (b) **Collapse the recommendation card** to one line ("Best: Lot 36 · 6 min ▾") and expand on tap. (c) **Merge the "Selected Pass" pill into the card's header row** so it stops taking a row of its own. (d) **Float the overlays** (`position: 'absolute'`, translucent background) so the map fills the whole screen behind them, not just the space left over. (e) Put the parking details in the existing `BottomSheet` behind a button. |
| Back button (top left) not visible in Settings and schedule screens | `src/app/settings/_layout.tsx`, `src/app/schedule/_layout.tsx` | On web, the header's back arrow is also an `Image` with `tintColor`, so it has the same filter problem. It is colored before the dark theme applies and stays near-black on a dark header. Fix: set `headerLeft` in both Stacks' `screenOptions` to a `Pressable` calling `router.back()` with a text "‹ Back" (or an SVG chevron) colored from `useTheme().text`. Check light and dark mode, and a reload straight onto a pushed page (e.g. `/settings/theme`), where there is no history and the button should go to the section root instead. |
