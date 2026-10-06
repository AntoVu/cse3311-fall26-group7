# Iteration 2 Roles

Please have done by Saturday, I want to submit the work early and enjoy my Sunday.

## Process

1. Pull `main` and make a branch: `git checkout -b <your-name>/<task>`. You could also reuse your old branch but be sure to pull from main.
2. Make the change and test it to make sure it works as you expected it.
3. Run all three and get 0 problems: `npx tsc --noEmit`, `npx expo lint`, `npm test`.
4. Open a pull request.

To see your change, run `npx expo start --web` and open `http://localhost:8081/map`. Open the developer console (F12) and click the toggle device toolbar to simulate what it would look like on your phone. You can also visit the website on your phone by running `npx expo start --web --tunnel` and visiting the provided link or scanning the QR code.

## Non-coding tasks

| Done | Task | Assignee | How to do it | Done when |
|:---:|---|---|---|---|
| No | Phone test the live site. Find bugs | | Open `https://antovu.github.io/cse3311-fall26-group7/` in your web browser on your phone. Play around for a while and try to use every feature. | Make a GitHub issue for every bug you encounter alongside screenshots. |

## Coding tasks

| Done | Task | Assignee | How to do it | Done when |
|:---:|---|---|---|---|
| No | Permit rules: faculty lots |  | In `src/constants/parking-permits.ts`, add `lot-f5`, `lot-f6`, `lot-f7`, `lot-f8`, `lot-f9`, `lot-f17` to `PARKING_LOT_IDS` and give each `'other'` in `LOT_KIND`, exactly like `lotF14`. | A test in `src/constants/__tests__/parking-permits.test.ts` shows a commuter is restricted from one of them at 10 AM on a weekday and allowed at 8 PM. The lots turn red instead of gray on the Parking tab. |
| No | Permit rules: Lots 28, 39, 46, ADAN, visitor lots |  | Look up each lot's zone in the PATS PDF and add it the same way, picking the matching `LotKind` (`westCommuter`, `eastCommuter`, ...). A pay or visitor lot no student permit covers is `'other'`. Ids are `lot-28`, `lot-39`, `lot-46`, `lot-adan`, `lot-visitor-1/2/3`. Leave the apartment lots and West Campus Garage alone. | One new test per lot kind used (e.g. "West Commuter may park in Lot 28 at 10 AM"). Those lots are colored on the Parking tab. |
| No | Make Measurement Units work |  | 1. Copy `src/state/parking-permit.ts` to `src/state/distance-unit.ts` (a store holding `'imperial'` or `'metric'`). 2. In `src/app/settings/measurement-units.tsx`, replace `useState` with that store and cut the choices to Imperial / Metric. 3. Give `formatDistance` in `src/routing/format.ts` a `unit` parameter: metric shows meters under 400 m, then kilometers. 4. Pass the unit from its two callers: `src/app/schedule/route/[classId].tsx` and `src/components/parking/parking-recommendation-card.tsx`. | `src/routing/__tests__/format.test.ts` has metric cases (300 m reads "300 m", 1,500 m reads "1.5 km"). Changing the setting changes the distance on a class's route screen. |
| No | Make 12/24-hour time work |  | 1. Make a store `src/state/time-format.ts` the same way (`'12-hour'` or `'24-hour'`). 2. Point `src/app/settings/time-standard.tsx` at it and delete the time-zone list (campus is in Central time). 3. Give `formatTime` in `src/components/settings/time-format.ts` a format parameter. 4. Classes store times as text like "1:30 PM", so in `src/components/schedule/class-list-item.tsx` show each time as `formatTime(parseTime(text), format)` (keep the text if `parseTime` returns null). | `src/components/settings/__tests__/time-format.test.ts` has 24-hour cases (870 minutes reads "14:30"). The Schedule tab switches format when the setting changes. |
| No | Use the shared confirm dialog |  | In `src/app/settings/profile/schedule.tsx`, replace the `Platform.OS === 'web'` / `Alert.alert` block with `confirmAction` from `src/components/ui/alert.ts`. | Removing a class in Settings > Profile > Schedule still asks first, on web. |
| No | Persistent save | | The schedule, parking permit, theme and start point survive a page reload. The site is pre-built, then loaded in the browser. If anything reads saved data while the page first renders, React throws the page away. So never read `localStorage` inside a store's initial value or a `useState` initializer. | Appropriate test files for persistent save written and specified values survive page reload. |
