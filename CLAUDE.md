# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

**mavigator** — an Expo / React Native app (TypeScript, React 19, React Native 0.86) implementing "Mavigator," a
UTA campus navigation app (see `inception_documents/` for the full design doc: indoor room navigation, permit-aware
parking recommendations, and high-foot-traffic rerouting are the three core features long-term).

## Path Aliases

`@/*` → `./src/*` and `@/assets/*` → `./assets/*` (configured in `tsconfig.json`).

## Current Architecture

```
src/
  app/          # Expo Router routes: map/, schedule/ (+ route/[classId]), parking/, settings/ (+ profile/), index.tsx redirect
  components/   # UI by area: map/, schedule/, settings/, parking/, ui/ (shared primitives); app-tabs(.web).tsx; themed-text/view
  constants/    # theme.ts (Colors/Fonts/Spacing), campus.ts, parking-permits.ts, schedule.ts
  context/      # schedule-context.tsx — ScheduleProvider + the pure schedule helpers (sort/classify/add/remove)
  state/        # create-store.ts + parking-permit.ts, theme-preference.ts (session-only shared settings)
  data/         # campus-*.ts generated from OpenStreetMap + map-labels.ts (hand-maintained)
  routing/      # geo/graph/dijkstra/route/eta/start-point/parking-recommendation — the nav engine
  mocks/        # schedule.ts (MOCK_SCHEDULE + ScheduleClass type), style-mock.js (jest)
  hooks/        # use-theme.ts, use-color-scheme.ts (applies the Settings theme override)
  types/        # map.ts
tools/osm/      # import.mts: regenerates src/data/ from OpenStreetMap (+ map-edits.json). Not bundled.
tools/digitizer/ # georef.ts + georef-default.json (PATS map georeference), legacy-iteration1.json
assets/         # Images, tab icons, fonts
inception_documents/  # APP_LAYOUT_INCEPTION.png (wireframes) + INCEPTION/USER_STORIES/USE_CASE_MODEL/... .md
```

**Tests:** 27 suites / 366 tests, all under `__tests__/` beside the code. Component tests use `react-test-renderer`
(see `class-list-item.test.tsx`, `parking-permit-options.test.tsx`); jest config lives in `package.json`
(`jest-expo` preset, `@/` path mapping, CSS mocked). Run `npx tsc --noEmit`, `npx expo lint` and `npm test` before
finishing; all three are at 0 problems as of 2026-09-20.

**Removed 2026-09-20 (don't recreate — it's in git history):** the wireframe-era parking lot grid
(`parking/[lotId].tsx`, `components/parking/{parking-lot-tile,lot-status-badge}.tsx`, `mocks/parking.ts`,
`constants/parking-map.ts`). The Parking tab is the map now; its lot ids never matched `CAMPUS_LOTS` and its
"almost full" statuses were invented. Also gone: the template `home*`/`explore*` tab icons and `BottomTabInset`.

**Routing:** `src/app/_layout.tsx` wraps the app in `ThemeProvider` and renders `AppTabs`. Tabs are defined in `src/components/app-tabs.tsx` using `NativeTabs` from `expo-router/unstable-native-tabs`. Add new screens by creating files in `src/app/` and adding a corresponding `NativeTabs.Trigger` in `app-tabs.tsx`.

**Theming:** `src/constants/theme.ts` exports `Colors` (light/dark), `Fonts` (platform-selected), `Spacing` and `MaxContentWidth`. Use the `useTheme()` hook to get the current color tokens in components rather than importing `Colors`, so the Settings > Theme override is applied.

**Platform variants:** Files suffixed `.web.tsx` / `.web.ts` replace their native counterpart on web (e.g., `animated-icon.web.tsx` replaces `animated-icon.tsx`).

**Status (2026-09-20, Iteration 1 submission day): the Iteration 1 goal is done — Modules 0-5 complete, and the
feature branches (parking, settings, schedule) are merged into `main`.**
The app boots straight to a working 4-tab shell (Map/Schedule/Parking/Settings) with the outdoor campus
map, a working Schedule (add/remove classes, live status), a permit-aware Parking map, and Settings drill-down.
Web QA was done on 2026-09-17; the later features were checked with tsc/lint/jest and web/android/ios bundle
exports but **not yet on a physical device** (native pickers, glow shadows and the tab icons are unverified there).

- **Module 0/1 (cleanup + nav shell):** done. Orphaned template files (`hint-row.tsx`, `web-badge.tsx`,
  `components/ui/collapsible.tsx`, `animated-icon.module.css`, orphaned Expo/React demo images) were
  manually deleted. `src/components/external-link.tsx` was kept at first as a likely helper for linking out to MyMav/UTA PATS
  pages from Settings, then deleted on branch IterationOneGaps (no caller; it is in git history and needs
  `expo-web-browser`, still a dependency).
  `assets/images/icon.png`, `splash-icon.png`, `android-icon-*.png`, `favicon.png`, `assets/expo.icon/` are
  still default Expo template art — kept only because `app.json` requires files at those paths; swap for
  real Mavigator branding when art exists. `LICENSE` (MIT, credits 650 Industries) was deliberately left
  alone since the repo still contains originally-templated source (theme.ts, themed-text/view.tsx, hooks,
  the app-tabs pattern).
  - **`src/app/index.tsx` is NOT orphaned — do not delete it.** It's a one-line
    `<Redirect href="/map" />` that makes Map the landing screen; without it, Expo Router has no route
    matching `/` and the web app shows "Unmatched Route" on load. It got swept up and deleted once already
    during the Module 0/1 cleanup pass (it looked like leftover template boilerplate) and had to be
    recreated during Module 5 QA when the app stopped loading. If a future cleanup pass is tempted to
    remove "unused" root files, check this one's contents first.
- **Module 2/3 (data model + outdoor map):** `src/types/map.ts` (`MapNode`/`MapEdge`/`Route`/
  `PointOfInterest`/`PoiCategory`/`CampusLot`/`CampusStreet`), `src/constants/campus.ts` (bounding box +
  SVG viewBox), `src/data/{campus-pois,campus-lots,campus-streets}.ts` (moved out of `mocks/` when the data became real). `src/components/map/{campus-map-view,
  poi-marker,building-footprint,lot-footprint,street-line,map-legend,poi-info-sheet}.tsx` render it —
  pan/pinch-zoom via `react-native-gesture-handler` + shared values, clamped to 1x-4x and to the campus
  bounds. `react-native-svg@15.15.4` added to `package.json` (matches the version Expo SDK 57 recommends).
  `src/app/_layout.tsx` now wraps the app in `GestureHandlerRootView` — required for the gestures to
  register on Android/web. **Superseded 2026-09-23: that traced data was replaced wholesale by the
  OpenStreetMap import — see "Campus map data" above.**
- **Module 4 (Schedule/Parking/Settings stub UI):** `src/mocks/schedule.ts` holds the wireframe's example
  classes. Schedule is a real list (see "Schedule" below) — tapping a class pushes a
  route-preview screen (`schedule/route/[classId].tsx`), which since Iteration 1.5 draws a real route. Parking was
  originally a lot-tile grid + summary card; **as of 2026-09-19 the Parking tab is the shared campus map
  instead (see "Parking tab" below), and the grid's files were deleted on 2026-09-20.** Settings
  drills down for real (`settings/profile/`, `settings/profile/schedule.tsx`, `settings/customization.tsx`).
  **As of the ayesha-settings branch** Parking Permit, Theme, Time Standard, Measurement Units and the manual
  Schedule entry are real screens. Parking Permit and Theme are wired to the rest of the app (see
  "Shared settings state" below); Schedule entries share global state via `ScheduleProvider` at the root layout
  so classes added in Settings > Profile > Schedule or via the Schedule tab's Add Class modal sync across both screens.
  Time Standard and Measurement Units keep local screen state and change nothing yet. Rows with nothing behind them
  (On-Campus Residence, Import MyMav) are still honestly-disabled `SettingsMenuItem`s rather than fake "coming soon" screens. The settings Stack uses
  `headerBackButtonDisplayMode: 'minimal'` so every settings page has a chevron-only back button.
  Settings > Measurement Units also offers Yards (local state only, like the rest of that screen).
- **Native tab icons:** `assets/images/tabIcons/{map,schedule,parking,settings}-v2{,@2x,@3x}.png` must be 24/48/72 px
  transparent PNGs. Metro's asset registry uses the 1x file's pixel size as the icon's intrinsic size, so the old
  large opaque files rendered as oversized white boxes in the native tab bar. `app-tabs.tsx` uses
  `renderingMode="template"` (icons get tinted); `app-tabs.web.tsx` tints with `tintColor` from `useTheme()`.
- Each new pushed screen (`route/[classId]`, `settings/profile/*`, `customization`) sets its own
  `<Stack.Screen options={{ headerShown: true, title: ... }} />` for a back button, even though the parent
  `_layout.tsx` Stacks default to `headerShown: false` for the tab-root screens.
- **Typed routes reminder:** `app.json` has `experiments.typedRoutes: true`. Every time new route files
  land, `npx tsc --noEmit` won't know about them (and `href`/`router.push` calls into them may show as
  type errors) until Expo Router's codegen regenerates — which happens automatically the next time
  `npx expo start` runs. Don't chase phantom typed-route errors without restarting the dev server first.
- **Module 5 (QA) results, 2026-09-17 — tested on web (`npx expo start --web`) via Playwright:**
  - All 4 tab links (Map/Schedule/Parking/Settings) navigate correctly and show the active tab state.
  - Schedule → tapping a class pushes `schedule/route/[classId]` with the right class info and a back button.
  - Parking → tapping a lot pushed `parking/[lotId]` (that screen has since been replaced by the map).
  - Settings → Your Profile and → App Customization both drill down correctly; disabled rows render
    visibly dimmed and non-interactive (confirmed no `cursor:pointer` / click handler on them).
  - Map → tapping a POI marker opens `PoiInfoSheet` with the correct name/category/building code.
  - Light and dark mode (emulated via `prefers-color-scheme`) both render cleanly on all 4 tabs — no
    illegible text, no broken contrast, no layout shifts between themes.
  - **Known non-blocking issue:** the browser console logs 6 repeated warnings, `Unknown event handler
    property 'onStartShouldSetResponder'` (and the 4 sibling Responder-system props, plus
    `onResponderTerminationRequest`). This comes from `react-native-gesture-handler`'s web fallback
    installing legacy React Native Responder System props on a plain `View`, which `react-native-web`
    doesn't recognize as a DOM prop. It's a known compatibility warning between
    `react-native-gesture-handler` and newer `react-native-web` versions — pan/pinch-zoom on the map still
    worked in manual testing despite it. Safe to ignore for Iteration 1; worth a version bump check
    (`react-native-gesture-handler`) in a later iteration if it gets noisy or something actually breaks.
  - Not yet tested: native (iOS/Android via Expo Go) — QA so far is web-only, since that's what's reachable
    from this session. Worth a manual pass on-device before the 09/20 deadline.

## Campus map data (OpenStreetMap, 2026-09-23)

**The map data is generated. Do not hand-edit anything in `src/data/` except `map-labels.ts`
and `map-edits.json` (the latter is written by the Campus Digitizer; see below).**
Run `npm run import:osm` to rebuild it (`-- --refresh` re-queries Overpass; responses are
cached under `tools/osm/cache/`, which is gitignored).

### Why it was replaced

Iteration 1 traced the campus by hand from the PATS PDF with the team's Campus Digitizer. That
data was **a median 865 ft out of place, up to 1,456 ft**, measured against OSM over 28
name-matched buildings.

The cause: the digitizer turns a traced pixel into lat/lng by taking its position *as a
fraction of the rectangle between the two calibration clicks* and stretching that fraction over
a hardcoded `CAMPUS_BOUNDS`. Its own instructions say to click the box's NW corner (Cooper x
UTA Blvd) then its SE corner (Center x Mitchell). The calibration clicked the **PDF page
corners** instead, so the whole page got squeezed into the campus box. The giveaway is that the
source PDF's page aspect is 1.3595 -- exactly the unexplained `1350x1000` `CAMPUS_VIEWBOX` fudge
someone had tuned by eye to stop buildings looking stretched.

The digitizer no longer calibrates by clicking at all (v2, 2026-09-24; see "Campus Digitizer"
below). For the record, the true intersections are Cooper x UTA Blvd `32.7337774, -97.1145585`
and Center x Mitchell `32.7283500, -97.1064780`. The hardcoded bounds never matched those, and
Mitchell is not straight east-west, so corner-clicking was approximate even done right. For
indoor floor plans, reuse `tools/digitizer/georef.ts` (fit from landmark pairs), not corners.

Hand-tracing also produced no walking paths, and Iteration 1.5 owes outdoor routing. OSM has
them. Adopting it retires tracked risk **R-09**.

### How the import works

- **What counts as on campus** is decided by UTA's own OSM boundary polygon (way `445352238`),
  not a hand-curated exclusion list. Buildings tagged as homes within `NEARBY_APARTMENT_METERS`
  (150 m) of it also count, which is US-04's "nearby apartments".
- `src/data/map-labels.ts` and `src/data/map-edits.json` are **the hand-maintained inputs** and
  the import never writes them. map-labels.ts holds the name-keyed labels seeded from Iteration 1;
  way-keyed work now goes through the digitizer into map-edits.json. The import prints a
  checklist (also saved to `tools/osm/cache/last-report.txt`).
- **Current output (2026-10-02):** 93 buildings, 61 lots, 218 streets, and a
  walkway graph of 2,464 nodes / 3,479 edges.
- `campus-walkways.ts` keeps **only junctions as nodes**; the shape between two junctions rides
  on `MapEdge.path`. That is what keeps a campus-wide graph near 520 KB instead of 1.4 MB. Node
  ids are renumbered to `n0`/`e0` for the same reason -- OSM ids are ten digits and each appears
  twice per edge.
- Only the **largest connected component** is kept. OSM has stray sidewalk fragments joined to
  nothing; dropping them beats inventing connections. A data test asserts the result is one
  component and that every building and lot is within 80 m of it.
- The walkway buffer follows `NEARBY_APARTMENT_METERS` deliberately: anything offered as a start
  point has to reach the graph. Raising it grows the graph fast (400 m pulled in one more
  apartment building for 60% more nodes).
- Clipping drops distant **nodes**, not distant ways. Filtering whole ways keeps every mile of a
  service road that happens to touch campus, which both bloats the graph and stretches the map's
  bounding box far past anything worth drawing.

### Campus Digitizer and `map-edits.json` (2026-09-24)

OSM outlines most of campus but names only part of it: the first import silently dropped
**~93 unnamed campus buildings** and left 62 of 67 lots without a PATS number, and some places
(Maverick Stadium, Gilstrap, Lots 24-27...) are not in OSM at all. The Campus Digitizer artifact
(`https://claude.ai/artifact/N3gpJx7ejuiTigoxHYj8Bg`, private to Anthony) fixes both over the PATS
Visitor Parking Map.

**Workflow:** `npm run import:osm` -> open the digitizer (it ships a copy of
`tools/osm/cache/digitizer-base.json`; "Load newer base data" takes a fresh one) -> upload the
PATS map PNG -> name/identify/trace -> "Save map-edits.json" into `src/data/` -> `npm run
import:osm` -> `npm test`. The report's **UNROUTABLE** section names any drawn place over 80 m from
a walkway (the campus data test fails on the same condition); trace a walkway to it.

- **`src/data/map-edits.json`** is written only by the digitizer and read only by the import
  (`tools/osm/edits.ts`, tested). It holds way-keyed labels for OSM buildings/lots (name,
  abbreviation, code, category, lot id, or `hidden`) and traced shapes (true lat/lng in
  `points`; `imagePoints` are PATS page fractions the tool reads back). **Precedence, field by
  field: map-edits.json, then map-labels.ts, then OSM tags.** A lot identified there is drawn even
  off campus (how the remote park and ride lots get in); a hand-named building overrides the
  excluded-names list.
- **Traced walkways** join the OSM network inside the import, on raw OSM nodes before the chain
  collapse: a vertex within `WALKWAY_SNAP_METERS` (12 m) reuses that node. The digitizer draws the
  same ring and snaps onto it, so "joined" in the tool means joined in the app.
- Hand-picked places past the campus edge widen the walkway clip around themselves (same 150 m
  buffer), so they can be routed to. Auto-included nearby apartments do not; they are already
  inside the campus buffer.
- **The draft lives in the artifact's `db`** (one doc per edit: `traced/*`, `osmBuildings/*`,
  `osmLots/*`, `settings/alignment`), mirrored in browser storage. Claude can read it back with
  `ArtifactData` and write `map-edits.json` directly if saving the file is inconvenient.
- **Never publish or commit the PATS PNG.** The digitizer keeps it in the browser (IndexedDB).

**Building categories (2026-09-25):** `academic`, `administration`, `misc`, `greek`, `residence`, `apartment`
(`PoiCategory`; `greek` = fraternity/sorority houses, added 2026-10-01). Order, labels and short names live in
`src/constants/poi-categories.ts`; colors in `POI_CATEGORY_COLORS` (administration violet, misc cyan, greek pink).
A new category must also go in `TRACED_KINDS`/`CLOSED_KINDS`/`tracedFeatures` (`tools/osm/edits.ts`) and in the
digitizer's `KINDS`, `STYLES`, `BUILDING_KINDS`, `categorySelect`, trace-kind `<select>` and legend. The legend lists only categories present on the
map. Changing a building's category changes its id (`<category>-<slug>`), like any rename.

**Same name = same place (2026-09-25).** `PointOfInterest.footprints` and `CampusLot.footprints`
are `Coordinate[][]`: one place, one or more outlines. The import groups building outlines by
trimmed, lowercased name and lot outlines by lot id (`groupBuildings` / `groupLots` in
`tools/osm/edits.ts`), so the two halves of the Aerodynamics Research Building are one ARB, University
Village's six blocks are one start point, and every polygon given `lot-49` shares Lot 49's permit
rule. Before this, a second polygon with the same lot id was emitted as `lot-49-2`, which no rule
knows, and the ARB halves had to be named differently to get past the abbreviation test. Lots nobody has
identified never merge. The first non-empty abbreviation/code/category/label in a group wins, and the
report lists **GROUPED** places and any **GROUP CONFLICT** (outlines of one place that disagree). The data
tests now assert one POI per name and one building per abbreviation. `coordinate` is the area-weighted
center of all outlines (`groupCenter`). Note University Police's two buildings merged too; give one a
different name if they should stay separate.

**Reshaped outlines.** The digitizer can reshape any building or lot outline, OSM's included. For an OSM
feature it stores an override on that way (`shape` in true lat/lng, `shapeImagePoints` for the tool),
which replaces the OSM ring in the import while the way keeps its name, labels and lot id; "Reset to OSM
shape" removes it. `digitizer-base.json` always carries OSM's original ring so that reset works. OSM
streets and sidewalks cannot be reshaped (the walkway graph is built from raw OSM nodes); trace a
walkway instead.

**Lot ids are `lot-<number or code>`** (`lot-36`, `lot-f13`, `lot-gr`, `lot-36-upgrade`), renamed from the
old doubled `lot-lot-36` on 2026-10-02 in `PARKING_LOT_IDS`, map-edits.json and the digitizer draft together.
A traced lot needs its PATS lot picked, or it falls back to `lot-traced-<name>`, which no rule knows.
**Lots 50N and 50S** are two outlines on the PATS map; both ids (`lot-50-north`, `lot-50-south`) carry Lot
50's South Commuter rule. Drawn but with no rule yet: 28, 39, 46, F4-F9, F17, ADAN, ADAS, 24, 31, 48, WC, MR,
the visitor lots, the apartment lots and West Campus Garage.

**Georeference (no calibration clicks).** Image positions are fractions of the PDF page (u = x/w,
v = y/h), so any render of the page lines up. `tools/digitizer/georef-default.json` is a
moving-least-squares fit (each point gets its own affine, weighted to nearby landmarks) from 39
street landmarks, found by sliding OSM street centerlines onto the map's white street fill cell by
cell (`tools/digitizer/derive-georef.mts`, rerun it if PATS publishes a new map). Leave-one-out
error: **3.5 m median, 10 m 90th percentile**. A single affine is not enough: the PATS drawing is
accurate in the core but shifted 20-30 m toward the west edge. The Iteration 1 trace's building
centroids seed the first pass only; they disagree with any fit by ~13 m (tracing noise). The
digitizer's Align mode adds your own landmark pairs where a region still looks off.

`tools/digitizer/legacy-iteration1.json` is the Iteration 1 trace converted back to page
fractions; the digitizer shows it as a reference layer and suggests lot numbers and names from it.

**Fixed on the way:** `polygonCenter` (tools/osm/transform.ts) computed the area-weighted centroid
on raw degrees, where the cross products cancel catastrophically: markers were off a median 4.6 m
and the small "UTA Information" kiosk 447 m. It now works relative to the first vertex; the
regenerated `campus-pois.ts`/`campus-lots.ts` differ from before only in `coordinate` lines.

### Coordinates and projection

- `CAMPUS_BOUNDS` is `CAMPUS_EXTENT` from the generated `campus-extent.ts` -- the box around
  everything drawn. **Change the area by re-importing, not by editing numbers.**
- `CAMPUS_VIEWBOX`'s width:height is the bounding box's **real-world meter aspect**
  (`lngSpan * cos(lat) / latSpan`). `projectCoordinate` scales lng and lat independently, so
  that ratio is exactly what makes the projection isotropic. `projection.test.ts` asserts a
  square on the ground stays square, so the old fudge cannot come back.
- `unprojectPoint` is the inverse, used by long-press-to-drop-a-pin.
- **Never measure distance in viewBox units** -- they are arbitrary drawing units.
  `src/routing/geo.ts` is the only place distances come from.
- `MIN_SCALE` is 0.25 (was 0.6). The data now fills the viewBox instead of sitting in one
  corner, so fitting the whole campus needs to zoom out further.

### ODbL obligations (not optional)

Map data is (c) OpenStreetMap contributors under the Open Database License. The generated files
are a derived database and carry the notice in their header; the app credits it in
**Settings > About**; the README records it. Keep all three for as long as the data stays.

## Outdoor routing (`src/routing/`)

Pure functions, no React, so they test without rendering -- the same discipline as the schedule
helpers. Fills in the `MapNode`/`MapEdge`/`Route` interfaces Iteration 1 declared and left unused.

- `geo.ts` -- `distanceMeters`, `bearingDegrees`, `pathLengthMeters`. Equirectangular with a
  cos(latitude) factor; at campus scale it agrees with haversine to well under a meter.
- `graph.ts` -- `buildGraph` (each edge usable both ways), `snapToGraph` (nearest node within
  `DEFAULT_SNAP_METERS`, skipping nodes no edge reaches).
- `dijkstra.ts` -- `shortestPath` and `shortestPathTree`, with a binary min-heap. An array scan
  would be quadratic over ~2,200 nodes, too slow to re-run on a render.
- `route.ts` -- `findRoute` snaps both ends, counts the walk on and off the path, and orients
  each edge's shape the way it is walked so the drawn line does not double back.
- `eta.ts` -- walking 1.4 m/s, biking 4.0 m/s (US-01 asks for both).
- `parking-recommendation.ts` -- `recommendLots` runs **one** `shortestPathTree` out from the
  class rather than a separate search per lot.
- `start-point.ts` -- a start point is stored as a **reference** (a POI or lot id), not a
  coordinate, so a re-import cannot silently move where someone lives. A dropped pin is the one
  exception.
- `campus-graph.ts` -- the campus graph, built once when first imported.
- `format.ts` -- feet under a quarter mile, then miles; `formatDuration` never says "0 min".
  The Measurement Units setting is still unwired; this is the one place that will need to learn
  about it.

**Sanity numbers** (pinned in `campus-route.test.ts`, so a unit slip shows up as an ETA nobody
would believe): Nedderman to the library 0.29 mi / 6 min; West Campus Garage to College Park
Center 0.75 mi / 14 min. Detour factors run 1.3-1.8x over the straight line, normal for a
pedestrian network.

**Drawing a route:** `CampusMapView` takes an optional `route` (a `RoutePlan.path`) and draws
`RouteOverlay` above the shapes but below the POI labels. Never copy the map component.

### Location and start points

- `useDeviceLocation()` is mounted once in the root layout so permission is asked for a single
  time and every screen shares one fix. Denied, location switched off, and a browser blocking
  geolocation all land on a permission state the start-point sheet explains, rather than
  leaving the UI waiting for a fix that never arrives.
- **Long-press the map to drop a pin.** It stands in for a GPS fix so the team can test
  snapping and routing without being on campus, and a pin outranks later device fixes so it
  cannot be yanked away mid-test. For real GPS off campus, use the Android emulator's Extended
  Controls > Location or iOS Simulator > Features > Location > Custom Location.
- `startPointStore` holds the choice; `resolveStartPoint` turns it into a coordinate and
  returns null (rather than throwing) when the place has gone or the location is unknown.

### Parking tab

`src/app/parking/index.tsx` renders the **same `CampusMapView`** as the Map tab — never copy map code; extend
the component's props instead so a map fix lands in both tabs. Options used here: `mutedBuildings` (buildings
+ labels in neutral gray, names still shown; no `onSelectPoi`, so buildings aren't tappable) and
`getLotColor(lot) => string | undefined` (per-lot highlight; `undefined` keeps the Map tab's neutral lot look)
and `route` (the walk to the class, drawn when a recommendation is tapped).

**Where to park (US-01).** `ParkingRecommendationCard` sits above the map. It takes the next unfinished
class from `useSchedule()`, resolves its building, and calls `recommendLots` with the class's start time as
the arrival time — permit rules change through the day, so *when* you arrive is part of the answer. Lots are
ranked by walking time and tapping one draws the route. What it deliberately does **not** claim is that a lot
will have a space: there is no public occupancy feed (see "Map data sources"), so that half of US-01 waits for
a data source rather than inventing numbers. The card says what is missing (no pass, no class left today,
building not on the map) instead of rendering empty.

**Unidentified lots.** The map draws every parking polygon OSM has, but only those matched by hand in
`map-labels.ts` carry an id the rules know. The tab asks `hasParkingRule(lot.id)` first and leaves the rest
neutral gray — painting them "not allowed" would claim knowledge we do not have.

**Permit rules** live in `src/constants/parking-permits.ts`. Nine purchasable permits: Preferred Garage, Student
Upgrade Lot 36, Student Upgrade Lot 49, West/East/South Commuter, Reduced Rate Greek Row Lot, Reduced Rate Lot 29 and
Remote Park & Ride. `getParkingPermission(permit, lotId, now?)` returns `allowed` / `restricted` / `timeRestricted`,
which indexes `PARKING_COLORS` for the lot's fill. Every lot has a kind in `LOT_KIND` (west/east/south commuter,
upgrade36/49, Maverick Garage, Greek Row, Lot 29, remote, or `other` for faculty F-lots and Lots CN/CS) and each
permit lists the kinds it covers. Rules, in order:
1. `null` (the "None" choice, the default) restricts every lot, as does any lot with no rule.
2. **After hours** (weekends, and weekdays before 7 AM or from 7 PM) every known lot is `allowed` for every permit,
   faculty lots included. (Before 7 AM counting as after hours is our assumption, not from the PATS rules.)
3. Otherwise a permit's own kinds are `allowed`. Upgrade and Preferred permits also cover every commuter,
   reduced-rate and remote lot; commuter permits also cover reduced-rate and remote lots (Park North/Central/South
   are East commuter lots).
4. Weekday daytime, commuters only: other-zone commuter lots are `timeRestricted` (yellow, "Opens at 1 PM") until
   1 PM, then `allowed`, but never upgrade lots or the Maverick Garage.
5. Everything else is `restricted`. The zone rule applies every weekday; the old "first weeks of a semester" gate
   was removed.

As of 2026-10-02 every rule lot is drawn except Lot 50 itself (drawn as 50N/50S) and Upgrade Lot 49, which
has an id and a rule but **no outline yet** (`CampusLot` needs a polygon, so it draws nothing). Trace it in the
Campus Digitizer with that PATS lot picked. Lot 49 (South Commuter) and Upgrade Lot 49 are
different lots. Pass `now` to make the rules testable — it defaults to the real clock, so lot colors genuinely
change during the day.

**Choosing the permit:** a compact "Selected Pass: X" pill at the top of the tab opens `ParkingPermitSheet`, a
pull-up sheet, the same way the Schedule tab's "+ Add Class" works — it does not navigate to Settings. The sheet
and Settings > Your Profile > Parking Permit both render `ParkingPermitOptions`, which reads and writes
`parkingPermitStore` directly, so a pick in either place is immediately the pick in the other.

Lots aren't tappable yet, and lot occupancy ("almost full") isn't modeled — there's no data source for it
(see "Map data sources"). **Planned for a later iteration, not now:** fold the likelihood of a lot being crowded or
full into the parking recommendations, as the inception document (US-01, "likelihood of finding a spot") calls for.
Today the map only answers "may my permit park here right now", never "will there be a space".

### Shared settings state

`src/state/` holds module-level stores (`createStore` + `useStore`, `useSyncExternalStore`), session-only — nothing
is persisted across app restarts yet (needs AsyncStorage or similar). `parkingPermitStore` (default `None`) is
written by Settings > Parking Permit and read by the Parking tab. `themePreferenceStore` (`system` | `light` |
`dark`, default `system` = follow the device) is written by Settings > Theme via `setThemePreference`; the
`useColorScheme` hook in `src/hooks/` applies it, so **always import `useColorScheme` from `@/hooks/use-color-scheme`,
never from `react-native`** or the override is skipped. `setThemePreference` also calls `Appearance.setColorScheme`
on native (react-native-web lacks it, so it is guarded).

### Schedule

- **State:** `ScheduleProvider` (`src/context/schedule-context.tsx`, mounted in `src/app/_layout.tsx`) holds the class
  list, seeded from `MOCK_SCHEDULE`; read it with `useSchedule()` → `{ classes, addClass, removeClass, currentTime }`.
  `classes` is the classified list (each item has a `status`).
  Session-only, like the stores in `src/state/`. The provider re-reads the clock every 30 s (skipped when
  `initialTime` is passed or under jest). The logic is pure exported functions (`parseTimeString`,
  `sortScheduleClasses`, `classifyScheduleClass`, `createScheduleClass`, `addClassToSchedule`,
  `removeClassFromSchedule`) so it is unit-tested without React.
- **Fields:** a `ScheduleClass` stores `courseCode`/`courseName`/`buildingId`/`roomNumber`.
  `buildingId` is a POI id from `CAMPUS_POIS` (resolve it through `src/data/buildings.ts`), **not** typed text —
  that link is what lets the schedule route to a class. It replaced a free-text `buildingCode` on 2026-09-23.
  `AddClassInput` now has one spelling per field; the second set (`classCode`/`building`/`room`) existed because
  the Schedule tab and Settings had separate forms, and they render the same `ManualAddClassForm` now.
- **Validation:** `validateClassInput` rejects empty fields, a building not on the map, and an end time at or
  before the start. The building field is a picker (`BuildingPickerField`) over every building, ordered academic ->
  administration -> misc -> residence -> apartment (`classBuildingOptions`, order in `constants/poi-categories.ts`), with
  search; it expands inline rather than opening its own sheet, because the form is often already inside one.
  Room numbers are still free text — nothing knows which rooms exist until the indoor work lands.
- **Order:** the list is always chronological (start time, then end time; unreadable times last).
  `addClassToSchedule`, the initial list and `classifyScheduleClass` all sort.
- **Status:** `classifyScheduleClass` gives `done` (now ≥ end), `upcoming` (the earliest unfinished class) or
  `normal`. A class that has already started keeps `status: 'upcoming'` with `startsInMinutes: 0` — that is how
  "in progress" is encoded, so `ClassListItem` treats `startsInMinutes <= 0` as **In progress** and shows exactly one
  label (In progress *or* "Upcoming class · Starts in N mins", never both). While a class is in progress the next
  class is `normal` (no label).
- **Card visuals (`components/schedule/class-list-item.tsx`):** faint **yellow** glow (border + `boxShadow`) for the
  upcoming class, faint **green** glow for the in-progress class, and a green circled **check** (drawn with Views, no
  icon font) at the top right for a finished class, matching the wireframe. Colors and the `withOpacity` helper are in
  `constants/schedule.ts` (`CLASS_STATUS_COLORS`). The card always reserves a transparent 1px border so the glow
  doesn't shift layout, and `schedule/index.tsx` puts the side padding on the FlatList's content (not the screen)
  because the scroll view would clip the glow otherwise. The colored flag bar on the left cycles through
  `CLASS_FLAG_COLORS` by list index.
- **Adding:** the Schedule tab's "+ Add Class" opens `AddClassSheet` and Settings > Profile > Schedule shows the
  same `ManualAddClassForm`; both call `addClass`, so they stay in sync. Validation is "all fields filled" via
  `Alert.alert` (`window.alert` on web).
- **Removing:** only from the class screen (`schedule/route/[classId].tsx`, red "Remove" in the header, with a
  confirm) and from Settings > Profile > Schedule's "My Classes" cards. The Schedule list cards no longer have a
  Remove button (`ClassListItem` still supports an optional `onRemove`). Note `Alert.alert` is a no-op on web, so
  those screens use `window.confirm` there.

### Shared UI primitives

`src/components/ui/` holds the pieces more than one screen needs. Reach for these before writing a new one —
four settings screens each had their own copy of the option row before 2026-09-20.

- **`BottomSheet`** — the app's pull-up sheet (dimmed backdrop, title, ✕, scrolling body, Android keyboard
  inset). Rendered in-tree rather than in a `Modal` so it can sit over a tab screen without fighting the native
  tab bar. Used by `AddClassSheet` (Schedule) and `ParkingPermitSheet` (Parking). It renders nothing when
  `visible` is false, so its children don't mount while closed.
- **`OptionRow`** — one pick-one-of-many row: highlighted and check-marked when selected, optional second line.
  Used by Theme, Time Standard, Measurement Units, Parking Permit and the permit sheet.

`SettingsMenuItem` (`components/settings/`) stays separate — it's a drill-down row, not a choice.

**Shared legend (both tabs).** `LegendBox`/`LegendRow` in `map-legend.tsx` are the one legend look (a centered,
wrapping row of dots + labels above the tab bar, from Abiy's Parking legend). `MapLegend` and `ParkingMapLegend`
only supply the rows; don't restyle a legend inside a screen.

**Shared map view (both tabs).** `CampusMapView` keeps its pan/zoom in `mapViewportStore`
(`src/components/map/map-viewport.ts`), stored independent of container size (`pxPerUnit` + center as 0..1
fractions of the viewBox). A pan/pinch end saves the view; a focused, measured map applies it. So zooming into
Lot 36 on the Map tab and switching to Parking shows the same place and magnification, and neither tab resets on
re-entry. When nothing has been saved yet, the first map to be measured starts fitted to all traced content
(`getContentBounds` + `fitViewport`) instead of the old center crop, which mostly showed empty map because the
traced area sits in the box's upper right. Don't add per-tab start-view props; change the store or the fit.
The fit math started as Abiy's `fitParkingLots` effect (feature/parking).

## Iteration 1 — Frontend Plan (Map tab)

Full architecture plan lives in the "Mavigator — Iteration 1 Frontend Architecture Plan" Claude doc
(created 2026-09-16). Summary for a fresh coding session — **do not start writing Iteration 1 code without
re-reading the full doc first if it's available**; this is a condensed pointer, not a replacement:

- **Goal:** the Map tab (outdoor mode) works well enough to demo — pan/zoom the campus, tap on-campus
  residence halls, nearby UTA Blvd apartments, and academic buildings as POIs. Indoor nav, real pathfinding,
  parking logic, and MyMav import are OUT of scope this iteration.
- **Map engine decision:** recommended a custom `react-native-svg`-based campus map (no Google Maps API,
  no dev client, works in Expo Go) over `react-native-maps`/`expo-maps`, because of the tight 09/20 deadline
  and Windows-only dev machines (iOS testing needs EAS Build or a Mac either way). Store POI coordinates as
  `{ lat, lng }` even so, to keep a future swap to a real map SDK cheap. **Confirm this choice with the team
  before building** — it was left as an open question in the plan doc.
- **New tabs:** Map, Schedule, Parking, Settings (replacing Home/Explore). Only Map gets real functionality
  this iteration; Schedule/Parking/Settings get static, wireframe-matching stub screens so the tab bar feels
  complete. Settings has real drill-down navigation (Profile → Schedule/Permit/Residence, Customization →
  Theme/Time Standard/Units) even as a stub, per the wireframe.
- **New route structure:** `src/app/{map,schedule,parking,settings}/` directories, each with its own
  `_layout.tsx` (Stack) where nested screens are needed. `src/app/index.tsx` is a `<Redirect href="/map" />`
  stub, not removed — see the Module 0/1 note above.
- **New data layer:** `src/types/map.ts` (`MapNode`/`MapEdge`/`Route`/`PointOfInterest`/`PoiCategory`,
  naming carried over from the inception doc's Node/Edge/Route design) `src/data/` (the real traced campus
  data: `campus-pois.ts`, `campus-lots.ts`, `campus-streets.ts`) and `src/mocks/` (`schedule.ts`, `parking.ts`:
  placeholders for UI work, deleted as those features get real data).
- **State:** no state library. (Update: cross-tab state now exists — `ScheduleProvider` context and the
  `src/state/` stores, see "Schedule" and "Shared settings state" above. Still session-only; add AsyncStorage or
  similar for persistence.)
- **Known open item:** on-campus residence hall names/coordinates and which UTA Blvd apartment complexes
  count as "nearby" are not in the inception doc or this repo — need real data from the team before
  `campus-pois.ts` can hold anything but placeholders.

## Product end goal (from `inception_documents/INCEPTION_WRITTEN_DELIVERABLE.pdf`)

The PDF is the team's graded inception design document (Team 7, CSE 3311). It's a binary PDF that many
tools can't read, so the parts that matter are summarized here. Not all of it is Iteration 1 work — this is
the long-term target so current decisions don't paint us into a corner.

- **Vision:** "Mavigator" reduces navigation time for UTA students/staff: permit-aware parking → fastest
  path to class → no confusion over room labeling. Beats the static PDF map and Google Maps because it knows
  the student's permit, schedule, and the exact room.
- **Goals:** (1) multi-floor indoor room-to-room navigation (hallways, stairs, elevators); (2) parking
  recommendations from class schedule + permit; (3) optimized routes between classes with distance + ETA;
  (4) rerouting around known high-foot-traffic areas/times; (5) class schedule integration.
- **Non-goals:** off-campus navigation (Google Maps covers it), real-time crowd monitoring (only known peak
  hours), commercial monetization.
- **Core features:** Indoor Room Navigation (node/edge graph with cross-floor connectivity); Permit-Specific
  Parking (allowed lots for time of day + likelihood of finding a spot + walking distance to first class);
  High Foot Traffic Rerouting (time of day as the key input, recalculated with Dijkstra or similar).
- **Tech design as written:** React Native + TypeScript, client-side only (no backend), OOP with
  `Node`/`Edge`/`Route` interfaces, lightweight 2D map (not 3D), and "hybrid: Google Maps API for outdoor +
  our own indoor routing". **We have deviated from the Google Maps part** — Iteration 1 uses a custom
  `react-native-svg` map (no API key). Keep that in mind if anyone cites the PDF for the map engine.
- **User stories** (acceptance criteria worth remembering):
  - US-01 Permit parking: user picks permit type — **East / South / West Commuter, Reduced Rate, Lot
    Upgrade, Staff Parking** (the PDF's Appendix also mentions resident permits); recommendations account
    for busy hours and time of year; show walking/biking ETA from lot to first class.
  - US-02 Indoor routing: multi-floor, specific room numbers; directions mention stairs/elevators/shortcuts.
  - US-03 Foot-traffic rerouting: show high-traffic zones (e.g. library front around noon) + a user toggle.
  - US-04 Residential routing: all UTA residence halls and campus apartments selectable as start points
    (maybe nearby off-campus apartments too).
  - US-05 Schedule import: paste a MyMav schedule as raw text and parse it.
- **Use cases:** UC-01 Select Parking Permit, UC-02 Calculate Optimal Path, UC-03 Set Starting Point,
  UC-04 Toggle Traffic Avoidance, UC-05 Navigate Indoor Route (switches from outdoor to indoor mode once the
  user is inside; error flows for unrecognized building/room and for reroutes that add time).
- **Iteration schedule:** It.1 09/20/26 working app on both platforms + node/edge graph architecture;
  It.2 10/11/26 indoor+outdoor navigation engine, Dijkstra, text directions, **Nedderman Hall fully mapped
  as proof of concept**; It.3 11/01/26 rest of campus + nearby apartments + parking lots mapped, parking
  helper, MyMav parser, prototype test with the 5 interviewed students; It.4 11/15/26 polish, iOS+Android
  compatibility testing, final demo.
- **Interview takeaways** (5 students): indoor room finding is the biggest pain, then permit-aware parking,
  shortest routes/ETA, avoiding crowds, automatic schedule import (one student asked for a MavID login),
  and dorm/apartment start points.
- **Risks tracked (exposure):** building remodel/demolition 4.0; new construction 2.5; cross-platform
  iOS/Android issues 2.1; unmappable locations (staff-only) 2.1; project redesign 2.0; losing a teammate 1.6;
  having to switch map API 1.5 (mitigation: model our own UTA map or find cheap map data).
- **Open questions the PDF lists:** how to efficiently get/create a vector layout of UTA (see the data
  sources section below); how to estimate peak hours and lot fullness; whether MyMav schedules can be
  imported or pasted as raw text.
- **Appendix links:** UTA campus map PDF; PATS "Where May I Park With My Permit?" PDF (time-of-day access
  rules, commuter zones, resident permits, lot upgrades like Lot 36 / Lot 49 / West Campus Garage); UTA
  Parking Finder (Modii); the repo.
- **Team split (for the document):** Ayesha — vision/domain; Abiy — research/customer access; Josue —
  technical architecture/competitors; Anthony — features/risk/dev plan.

## Map data sources — what's usable (researched 2026-09-18)

**Rule of thumb: this repo is public, so only commit data we're allowed to redistribute.**

- **OpenStreetMap — now the map's actual source (imported 2026-09-23; see "Campus map data").** Free under the ODbL (needs
  attribution "© OpenStreetMap contributors"; add it to an About/Settings screen if we ship OSM-derived
  geometry). Query the Overpass API (`https://overpass-api.de/api/interpreter`) for `way["building"]` in
  `CAMPUS_BOUNDS`. In the campus-core box it returns **74 buildings, 53 with names, 20 with
  `building:levels`, only 2 with a `ref`/short code** — so OSM supplies true georeferenced outlines and
  names, while building codes/abbreviations still come from the PDF index. It also tags dorms
  (`building=dormitory`), apartments, and levels. The public server is shared and returned a 504 once —
  retry, keep queries small, don't hammer it.
  - **Accuracy check:** comparing centroids of the 19 buildings whose names match our hand-traced
    `campus-pois.ts`, the PDF-derived positions differ from OSM by a **median ~205 ft (max ~560 ft, e.g. Life
    Science Building)**. OSM is traced from aerial imagery so it's probably the more accurate of the two, but
    verify a couple of buildings visually before trusting either. Consider auto-importing OSM outlines and
    only hand-tracing what's missing or wrong.
- **maps.uta.edu (Concept3D, map id 2229) — technically reachable, but not ours to take.** It's a stock
  Concept3D map; its JavaScript shows locations, categories, search, polygons/polylines, directions, and
  floor references. Its API key is embedded in the page's client JS for the site's own use. Concept3D's
  end-user terms prohibit copying, framing or mirroring the service's content and don't say who owns the map
  data, and the key isn't ours. **Do not scrape it or commit anything pulled from it.** If we want its data
  (building footprints, room lists), ask UTA instead — see below. Not yet confirmed whether it has indoor
  floor plans for UTA.
- **Indoor floor plans / room numbers — not public.** UTA's Office of Facilities Management keeps them in
  **CASIM** (Campus Inventory Space Management); access is by request via the facilities planning page
  (`ofm@uta.edu`, 817-272-3571). Residence-hall floor plans are public on UTA Housing's site
  (`uta.edu/campus-ops/housing/reshalls/rh-floorplans`). For the Iteration 2 Nedderman proof of concept,
  requesting CASIM access as a class project is the realistic route; hand-mapping is the fallback.
- **Parking availability — no public API found.** UTA's Parking Finder (`go.uta.edu/park`, built by Modii,
  run by PATS) shows real-time occupancy for roughly 40% of lots (as of 2023, sensors expanding toward ~85%)
  and predicted arrival-time occupancy, filtered by permit. That's exactly the "likelihood of finding a
  spot" input from US-01. Ask PATS whether a data feed is shareable; until then use static lot/permit rules
  from the PATS permit PDF.
- **Best move for anything from UTA:** email Facilities Management / PATS / the campus map owner explaining
  it's a CSE 3311 class project and ask what's shareable and under what terms.

## Testing and Linting

```bash
npm test          # jest-expo; unit tests live in a __tests__/ folder next to the code they test
npx tsc --noEmit
```

**Test layout convention:** unit tests go in `__tests__/` beside the code (e.g. `src/components/map/__tests__/`);
anything integration/e2e/smoke goes in a top-level `tests/` folder once it exists. Jest treats every file in a
`__tests__/` as a test, so shared helpers belong in `__fixtures__/`, and never put tests under `src/app/`
(Expo Router would make them routes).

Tests cover the routing engine (geo/graph/dijkstra/route/eta/start-point/parking recommendation, including real-campus distances and ETAs), the OSM import transforms under `tools/osm/`, projection and its inverse, pinch-zoom math (`map-geometry.ts`), the saved map view (`map-viewport.ts`), the
tap-after-drag guard (`tap-guard.ts`), campus-data integrity, the schedule helpers and `ClassListItem`, the
`src/state/` stores, parking-permit rules, and the settings time formatting. The gesture math and tap guard were pulled out of `campus-map-view.tsx` into those
files so they are testable and lint-clean. TS 6 no longer auto-includes `@types/*`, so `tsconfig.json` lists
`"types": ["jest"]` — add to it if you add another types package.

```bash
npx expo lint
```

## Known open items (2026-09-23)

- **Outdoor mapping is essentially done (2026-10-02):** 93 buildings, 61 lots, every permit-rule lot drawn but
  Upgrade 49. Left: 5 small OSM parking areas without a lot number, 47 unnamed minor buildings (skipped on
  purpose), and permit rules for the lots listed under "Lot ids" above. West Campus Garage still has no entry in
  `PARKING_LOT_IDS`; confirm its tier with PATS.
- Nothing persists across app restarts (schedule, permit, theme, start point, pinned location). Time Standard
  and Measurement Units still change nothing; `src/routing/format.ts` is where units would be wired in.
- Not tested on a physical device: native time pickers, status glows, tab icons, the pull-up sheets, and now
  the **location permission prompt and the long-press pin**. Everything is verified only by tsc/lint/jest and
  web/Android/iOS bundle exports.
- Routing is outdoor only and produces a line, a distance and an ETA. No text turn-by-turn directions
  (UC-02 step 7) and no foot-traffic avoidance (US-03) yet.
- Hardcoded hex colors remain in a few screens (`#3c87f7` Add Class button, `#e53935` Remove); route colors
  are centralized in `constants/routing.ts` and status colors in `constants/schedule.ts`.
- Use `showAlert`/`confirmAction` from `components/ui/alert.ts` rather than `Alert.alert`, which is a no-op on
  react-native-web. A few older screens still have their own `Platform.OS === 'web'` branches.
- `inception_documents/RISK_ASSESSMENT.md` and `DEVELOPMENT_PLAN.md` are stale: they predate the sub-iteration
  schedule (1.5 due 10/04, 2.5 due 10/25) in the submitted Iteration 1 document, and R-09 is now retired.
