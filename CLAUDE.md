# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

**mavigator** — an Expo / React Native app (TypeScript, React 19, React Native 0.86) implementing "Mavigator," a
UTA campus navigation app (see `inception_documents/` for the full design doc: indoor room navigation, permit-aware
parking recommendations, and high-foot-traffic rerouting are the three core features long-term).

## Path Aliases

`@/*` → `./src/*` and `@/assets/*` → `./assets/*` (configured in `tsconfig.json`).

## Current Architecture (as of the unmodified Expo template)

```
src/
  app/          # Expo Router file-based routes (_layout.tsx, index.tsx, explore.tsx)
  components/   # Shared UI components; .web.tsx files override native implementations on web
  constants/    # theme.ts — Colors, Fonts, Spacing, layout constants
  hooks/        # use-theme.ts (returns current Colors object), use-color-scheme.ts
assets/         # Images, tab icons, fonts
```

**Routing:** `src/app/_layout.tsx` wraps the app in `ThemeProvider` and renders `AppTabs`. Tabs are defined in `src/components/app-tabs.tsx` using `NativeTabs` from `expo-router/unstable-native-tabs`. Add new screens by creating files in `src/app/` and adding a corresponding `NativeTabs.Trigger` in `app-tabs.tsx`.

**Theming:** `src/constants/theme.ts` exports `Colors` (light/dark), `Fonts` (platform-selected), `Spacing`, `BottomTabInset`, and `MaxContentWidth`. Use the `useTheme()` hook to get the current color tokens in components.

**Platform variants:** Files suffixed `.web.tsx` / `.web.ts` replace their native counterpart on web (e.g., `animated-icon.web.tsx` replaces `animated-icon.tsx`).

**Status (2026-09-17): Iteration 1's Map-tab goal is functionally done — Modules 0-5 all complete.**
The app boots straight to a working 4-tab shell (Map/Schedule/Parking/Settings) with the outdoor campus
map, mock Schedule/Parking data, and Settings drill-down all wired up and QA-passed on web.

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
  SVG viewBox), `src/mocks/{campus-pois,campus-lots,campus-streets}.ts`. `src/components/map/{campus-map-view,
  poi-marker,building-footprint,lot-footprint,street-line,map-legend,poi-info-sheet}.tsx` render it —
  pan/pinch-zoom via `react-native-gesture-handler` + shared values, clamped to 1x-4x and to the campus
  bounds. `react-native-svg@15.15.4` added to `package.json` (matches the version Expo SDK 57 recommends).
  `src/app/_layout.tsx` now wraps the app in `GestureHandlerRootView` — required for the gestures to
  register on Android/web. **See the "Accurate campus-core mapping" section below — the POI/lot/street
  data is no longer illustrative for the Cooper/UTA Blvd/Center/Mitchell box.**
- **Module 4 (Schedule/Parking/Settings stub UI):** `src/mocks/schedule.ts` and `src/mocks/parking.ts`
  hold the wireframe's example data. Schedule is a real (if inert) list — tapping a class pushes a stub
  route-preview screen (`schedule/route/[classId].tsx`) that says routing is coming later. Parking was
  originally a lot-tile grid + summary card (its detail screen `parking/[lotId].tsx`, `components/parking/*`,
  and `mocks/parking.ts` are still in the repo but currently unreachable) — **as of 2026-09-19 the Parking
  tab's index is the shared campus map instead, see "Parking tab map" below.** Settings
  drills down for real (`settings/profile/`, `settings/profile/schedule.tsx`, `settings/customization.tsx`).
  **As of the ayesha-settings branch** Parking Permit, Theme, Time Standard, Measurement Units and the manual
  Schedule entry are real screens. Only Parking Permit and Theme are wired to the rest of the app (see
  "Shared settings state" below); Time Standard, Measurement Units and manual class entries keep local screen
  state and change nothing yet. Rows with nothing behind them (On-Campus Residence, Import MyMav) are still
  honestly-disabled `SettingsMenuItem`s rather than fake "coming soon" screens. The settings Stack uses
  `headerBackButtonDisplayMode: 'minimal'` so every settings page has a chevron-only back button.
- Each new pushed screen (`[lotId]`, `route/[classId]`, `settings/profile/*`, `customization`) sets its own
  `<Stack.Screen options={{ headerShown: true, title: ... }} />` for a back button, even though the parent
  `_layout.tsx` Stacks default to `headerShown: false` for the tab-root screens.
- **Typed routes reminder:** `app.json` has `experiments.typedRoutes: true`. Every time new route files
  land, `npx tsc --noEmit` won't know about them (and `href`/`router.push` calls into them may show as
  type errors) until Expo Router's codegen regenerates — which happens automatically the next time
  `npx expo start` runs. Don't chase phantom typed-route errors without restarting the dev server first.
- **Module 5 (QA) results, 2026-09-17 — tested on web (`npx expo start --web`) via Playwright:**
  - All 4 tab links (Map/Schedule/Parking/Settings) navigate correctly and show the active tab state.
  - Schedule → tapping a class pushes `schedule/route/[classId]` with the right class info and a back button.
  - Parking → tapping a lot pushes `parking/[lotId]` with the right lot info and a back button.
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

## Accurate campus-core mapping (2026-09-17, re-traced 2026-09-18)

The Map tab's data for one specific area — the campus core bounded by
**S Cooper St (west), UTA Blvd (north), S Center St (east), and W Mitchell St
(south)** — is no longer illustrative.

**Re-traced 2026-09-18 on branch `UpdatedMapIntegration`.** The original pass (below) digitized this box
from the 2019 PDF map, but that trace turned out to be inaccurate (see the OSM comparison in "Map data
sources" below — median ~205 ft off, up to ~560 ft). The team wiped it and re-traced the whole box from
scratch with the team's own Campus Digitizer tool, calibrated against satellite imagery instead of the PDF.
Building codes/abbreviations are still cross-referenced against the PDF's building index where available.

- `src/constants/campus.ts` — `CAMPUS_BOUNDS` **must exactly match the `CAMPUS_BOUNDS` hardcoded inside the
  Campus Digitizer tool** (the full Cooper/UTA Blvd/Center/Mitchell rectangle: `minLat 32.7265, maxLat
  32.733875, minLng -97.115286, maxLng -97.106994`), not a box fitted to whatever's currently traced — every
  point the digitizer exports is a fraction-of-the-way between your two calibration clicks, mapped into
  *that* box. A 2026-09-18 pass briefly tightened these bounds to fit just the traced data at the time, which
  broke two things at once: newly-traced/extended shapes outside that tighter box became unreachable even at
  full pan, and `CAMPUS_VIEWBOX`'s aspect ratio (derived from the bounds) no longer matched what the data was
  calibrated against, so every shape rendered visibly stretched (a traced 45° corner stopped looking like
  45°). Fixed same day by reverting to the digitizer's exact box. **`CAMPUS_VIEWBOX`'s width:height must match
  the pixel aspect of the calibration rectangle on the image that was traced, not the bounds' real-world
  aspect** (the digitizer stores fractions of that rectangle). Measured from Nedderman Hall (130x181 px on the
  source map vs 130x~258 in the app at 946x1000), it's `1350x1000`; if shapes still look stretched, measure
  another building and tune that one number. Read the file's own comment before touching either number again.
  (Note the lat/lng values are therefore only approximately real-world coordinates — fine for this SVG map,
  not for feeding to a third-party maps API.)
- `src/data/campus-pois.ts` — 37 POIs (academic buildings + on-campus dorms + one off-campus apartment,
  "The Lofts") inside the box, each with a digitized footprint polygon. Includes Maverick/Vandergriff/West
  Hall-style dorms that an earlier (2026-09-17) pass had wrongly removed as "fabricated" — see the git
  history on this file if you need the old PDF-era CORRECTION note. Vandergriff Hall is traced as two
  separate footprints (`residence-vandergriff-hall-north` / `-south`, same display name) since it's an
  irregular multi-wing building and every id in the array must stay unique.
- `src/data/campus-lots.ts` — 16 parking lots/garages. `src/data/campus-streets.ts` — 4 street
  centerlines (UTA Blvd, S Cooper St, W Mitchell, S Center St). Both purely visual (not wired into the
  Parking tab or any routing graph yet).
- `src/components/map/{building-footprint,lot-footprint,street-line}.tsx` — render the above.
  `campus-map-view.tsx` layers them: streets → lots → building footprints → POI dots/labels on top.
  `poi-marker.tsx` only draws a dot for POIs with no footprint (the footprint itself is the marker
  otherwise), and labels by `abbreviation` (not full `name`) when a footprint exists, rendering no label at
  all if the POI has no abbreviation yet — full names are too long to fit without overlapping at this box's
  building density; tapping still opens `PoiInfoSheet` with the full name. Buildings with no abbreviation
  fall back to the full name in a smaller font.
- Tapping a building opens `poi-info-sheet.tsx`: name, category + abbreviation (not `buildingCode` — codes are
  outdated and UTA no longer publishes them for new buildings), and `building-preview.tsx` (the footprint
  alone on the dimmed backdrop, a placeholder for future indoor navigation).
- `projection.ts` holds `projectCoordinate`/`projectPath` (lat/lng → SVG viewBox), shared by the map and the
  building preview.
- **Tap-after-drag guard:** releasing a finger after a pan/pinch makes react-native-svg fire `onPress` on the
  shape underneath. `campus-map-view.tsx` tracks gesture start/end (via `scheduleOnRN`) and ignores presses
  during a gesture and for `TAP_AFTER_GESTURE_MS` (250) after. Timing-based; tune that constant if real taps
  feel swallowed or drags still open the sheet. Logic lives in `tap-guard.ts` (`createTapGuard`).
- Everything outside this box (rest of campus, other off-campus apartments) is still the old
  illustrative/unverified data — this remains a deliberately scoped area, not a full campus remap.
- Footprints are simplified (not every real-world jag traced) but should now track satellite imagery
  fairly closely. `npx tsc --noEmit` passes clean against this data as committed.

### Parking tab map (2026-09-19)

`src/app/parking/index.tsx` renders the **same `CampusMapView`** as the Map tab — never copy map code; extend
the component's props instead so a map fix lands in both tabs. Options used here: `mutedBuildings` (buildings
+ labels in neutral gray, names still shown; no `onSelectPoi`, so buildings aren't tappable) and
`getLotColor(lot) => string | undefined` (per-lot highlight; `undefined` keeps the Map tab's neutral lot look).
Lots are colored by `getParkingPermission(permit, lot.id)` from `src/constants/parking-permits.ts`, using the
permit picked in Settings (a compact "Selected Pass: X" pill at the top of the Parking tab that opens Settings >
Parking Permit when tapped; there is no picker on the tab itself). Schedule start/end times use `TimePickerField`
(`components/settings/`): the phone's own time picker snapped to 5-minute steps via
`@react-native-community/datetimepicker` (Android system dialog, iOS wheel in a sheet). Web falls back to a text
box (`.web.tsx`) since web isn't a target. Some classes really do start on 5-minute marks.
Choosing "None" (the default) means no permit, so every lot is restricted (red). `CAMPUS_LOTS` ids (`lot-lot-36`,
…) don't match `MOCK_PARKING_LOTS` ids (`lot-36`, …). Lots aren't tappable yet.

### Shared settings state

`src/state/` holds module-level stores (`createStore` + `useStore`, `useSyncExternalStore`), session-only — nothing
is persisted across app restarts yet (needs AsyncStorage or similar). `parkingPermitStore` (default `None`) is
written by Settings > Parking Permit and read by the Parking tab. `themePreferenceStore` (`system` | `light` |
`dark`, default `system` = follow the device) is written by Settings > Theme via `setThemePreference`; the
`useColorScheme` hook in `src/hooks/` applies it, so **always import `useColorScheme` from `@/hooks/use-color-scheme`,
never from `react-native`** or the override is skipped. `setThemePreference` also calls `Appearance.setColorScheme`
on native (react-native-web lacks it, so it is guarded).

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
- **State:** no state library needed yet — plain component state per screen. Revisit Context/Zustand only
  once Parking/Settings need real cross-tab state (Iteration 2+).
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

- **OpenStreetMap — usable, and the best geometry source we've found.** Free under the ODbL (needs
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

Tests cover projection, pinch-zoom math (`map-geometry.ts`), the tap-after-drag guard (`tap-guard.ts`) and
campus-data integrity. The gesture math and tap guard were pulled out of `campus-map-view.tsx` into those
files so they are testable and lint-clean. TS 6 no longer auto-includes `@types/*`, so `tsconfig.json` lists
`"types": ["jest"]` — add to it if you add another types package.

```bash
npx expo lint
```
