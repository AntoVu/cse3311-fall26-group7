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
  manually deleted. `src/components/external-link.tsx` was kept deliberately (generic utility, not Expo
  branding, no current caller — likely useful later for linking out to MyMav/UTA PATS pages from Settings).
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
  route-preview screen (`schedule/route/[classId].tsx`) that says routing is coming later. Parking is a
  real lot grid + summary card — tapping a lot pushes a detail screen (`parking/[lotId].tsx`). Settings
  drills down for real (`settings/profile/`, `settings/profile/schedule.tsx`, `settings/customization.tsx`)
  but every row one level past what the wireframe actually details (Parking Permit, On-Campus Residence,
  Import MyMav, Manual Input, Theme, Time Standard, Measurement Units) renders as an honestly-disabled row
  via `SettingsMenuItem` rather than a fake "coming soon" destination screen — nothing behind those exists
  yet and a dimmed row seemed clearer than a dead-end page.
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

## Accurate campus-core mapping (2026-09-17)

The Map tab's data for one specific area — the campus core bounded by
**S Cooper St (west), UTA Blvd (north), S Center St (east), and W Mitchell St
(south)** — is no longer illustrative. It's digitized from the official 2019
UT Arlington campus map PDF (uta.edu/pats/_documents/UT%20Arlington%20Campus%20Map.pdf),
which has a building index keying every 3-digit code to a real name.

- `src/constants/campus.ts` — `CAMPUS_BOUNDS`/`CAMPUS_VIEWBOX` now describe just this box, anchored to
  real-world lat/lng via two Wikipedia-geotagged buildings inside it (Nedderman Hall, College Park Center).
  Read the file's own comment before touching these numbers — it explains exactly what's trustworthy
  (relative position/shape) versus approximate (absolute lat/lng, off by an estimated 50-100 ft).
- `src/mocks/campus-pois.ts` — every academic/institutional building and on-campus dorm inside that box,
  each with a real name, real building code, and a digitized footprint polygon (not just a dot). **This
  also corrects a mistake**: "Maverick Hall", "Vandergriff Hall", and "West Hall" (previously listed as
  dorms) aren't in the official building index at all and were removed — flag it if the team knows
  otherwise, but they look fabricated from earlier ad-hoc research. The 4 real dorms in this box are
  Arlington Hall, Trimble Hall, Hammond Hall, Kalpana Chawla Hall.
- `src/mocks/campus-lots.ts` (new) / `src/mocks/campus-streets.ts` (new) — parking lot/garage footprints
  and street centerlines for the same box, both purely visual (not wired into the Parking tab or any
  routing graph yet).
- `src/components/map/{building-footprint,lot-footprint,street-line}.tsx` (new) — render the above.
  `campus-map-view.tsx` layers them: streets → lots → building footprints → POI dots/labels on top.
- Everything outside this box (rest of campus, the off-campus UTA Blvd apartments) is still the old
  illustrative/unverified data — this was a deliberately scoped first pass, not a full remap.
- Footprints are simplified (rectangles/simple polygons, not every real-world jag traced), so a couple of
  tightly-packed buildings show minor visual overlap — positions and relative layout are still correct.
  `npx tsc --noEmit` passes clean against this data as committed.

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
  naming carried over from the inception doc's Node/Edge/Route design) and `src/mocks/` (`campus-pois.ts`,
  `schedule.ts`, `parking.ts`) for UI testing before real data exists.
- **State:** no state library needed yet — plain component state per screen. Revisit Context/Zustand only
  once Parking/Settings need real cross-tab state (Iteration 2+).
- **Known open item:** on-campus residence hall names/coordinates and which UTA Blvd apartment complexes
  count as "nearby" are not in the inception doc or this repo — need real data from the team before
  `campus-pois.ts` can hold anything but placeholders.

## Linting

```bash
npx expo lint
```
