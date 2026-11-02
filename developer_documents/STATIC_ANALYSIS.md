# Static Analysis Homework: Mavigator

Author: Anthony Vu. Line numbers refer to the `main` branch at commit `e82d672`.

## (A) Tool: ESLint with typescript-eslint's type-aware "strict" rules

Mavigator is written in TypeScript (Expo / React Native), so I used **ESLint** (https://eslint.org/) from the
JavaScript list, extended with **typescript-eslint** (https://typescript-eslint.io/), ESLint's TypeScript plugin.
Its type-checked rules run the TypeScript compiler over the project, so they can reason about types (for
example "this value is a Promise"), which plain ESLint cannot. Versions: ESLint 9.39.5,
@typescript-eslint/eslint-plugin 8.70.0, TypeScript 6.0.3, Node 24.18.0 on Windows 11.

1. Install Node.js from https://nodejs.org/ (this also installs `npm` and `npx`).
2. Clone the project and install its dependencies:
   ```
   git clone https://github.com/AntoVu/cse3311-fall26-group7.git
   cd cse3311-fall26-group7
   npm install
   ```
   ESLint needs no separate download: the project already lists `eslint` and `eslint-config-expo` as dev
   dependencies, and `eslint-config-expo` brings in typescript-eslint. `npx eslint --version` prints `v9.39.5`.
3. The project's normal lint (`npx expo lint`) reports 0 problems, because Expo's preset enables only a light
   rule set. I wrote a second config file, `eslint.static-analysis.config.js`, that keeps the project's rules
   and adds typescript-eslint's `strict-type-checked` preset:
   ```js
   const { defineConfig } = require('eslint/config');
   const tseslint = require('@typescript-eslint/eslint-plugin');
   const baseConfig = require('./eslint.config.js');

   module.exports = defineConfig([
     baseConfig,
     {
       files: ['src/**/*.{ts,tsx}'],
       extends: [tseslint.configs['flat/strict-type-checked']],
       languageOptions: {
         parserOptions: { projectService: true, tsconfigRootDir: __dirname },
       },
     },
     { ignores: ['src/data/campus-*.ts'] },
   ]);
   ```
   `projectService: true` loads the project's `tsconfig.json`, which the type-aware rules need. The
   `src/data/campus-*.ts` files are excluded because they are generated map data, not hand-written code.
4. Run it over all of the app's source code:
   ```
   npx eslint -c eslint.static-analysis.config.js src
   ```
   It reported **494 problems** across 16 rules. (The preset labels them "error", but none of them stops the
   app from compiling, so I treat them as warnings.)

My four warnings do not overlap with the ones my teammates chose to analyze.

## (B) Four warnings

Four warnings, four different rules, from two families: **Promise handling** (W1, W3) and **type safety**
(W2, W4).

### W1. `no-floating-promises`: `src/hooks/use-device-location.ts:59`

> Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or
> be explicitly marked as ignored with the `void` operator.

```ts
export function useDeviceLocation() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    ...
    async function follow() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (canceled) return;
        if (status !== 'granted') { locationPermissionStore.set('denied'); return; }
        locationPermissionStore.set('granted');
        subscription = await Location.watchPositionAsync(..., (position) => { setGpsLocation(...); });
      } catch {
        if (!canceled) locationPermissionStore.set('unavailable');
      }
    }

    follow();          // line 59 (L)
    ...
  }, []);
}
```

M is the effect callback inside `useDeviceLocation`. The warned behavior is a Promise that rejects with
nobody listening (an "unhandled promise rejection").

- **B.1 Reachable? Yes.** Any component that calls `useDeviceLocation()` runs this effect after its first
  render, and the effect reaches line 59 whenever `NODE_ENV` is not `'test'`. Example: the root layout
  `src/app/_layout.tsx` calls the hook, so opening the app reaches L.
- **B.2 Can the warned behavior occur? Yes, but only by a contrived call.** Every statement of `follow` is
  inside `try`, so a failed permission prompt or GPS call is caught. The Promise can still reject if the
  `catch` block itself throws. `locationPermissionStore.set` (`src/state/create-store.ts`) calls every
  subscribed listener synchronously, and any code may subscribe one. Scenario: some module runs
  `locationPermissionStore.subscribe(() => { throw new Error('x'); })`, then the app starts. On the
  `'granted'` path, `set('granted')` throws inside `try`, the `catch` runs `set('unavailable')`, which throws
  again, `follow()` rejects, and since line 59 discards the Promise the rejection is unhandled.
- **B.3 Reachable in normal execution? Yes.** Every normal app start reaches line 59 (same as B.1).
- **B.4 Can it occur in normal execution? No.** In the real app the store's only listeners are React's
  `useSyncExternalStore` subscriptions (via `useStore`), which only schedule a re-render and do not throw.
  The location store is not persisted, so no storage code listens to it either. Errors from the
  `watchPositionAsync` callback happen later, in a different call stack, not in `follow`'s Promise. So
  `follow()` always resolves.

**Verdict:** a valid warning about a real pattern, but a false alarm for this code today. The fix costs
nothing and documents the intent: `void follow();`.

### W2. `no-unsafe-enum-comparison`: `src/hooks/use-device-location.ts:33`

> The two values in this comparison do not have a shared enum type.

```ts
const { status } = await Location.requestForegroundPermissionsAsync();
if (canceled) return;

if (status !== 'granted') {        // line 33 (L)
  locationPermissionStore.set('denied');
  return;
}
```

M is `follow`. `status` has the TypeScript enum type `PermissionStatus` from `expo-modules-core`, declared
as `enum PermissionStatus { GRANTED = "granted", UNDETERMINED = "undetermined", DENIED = "denied" }`.
The code compares it with the plain string `'granted'`. The rule warns because such a comparison is not
checked: if the literal were misspelled (`'granded'`) or the enum's value changed, TypeScript would say
nothing and the comparison would silently always be true.

- **B.1 Reachable? Yes.** Once the permission request resolves and the effect has not been cleaned up
  (`canceled` is false), line 33 runs. Example: open the app in a browser and answer the location prompt.
- **B.2 Can the warned behavior occur? No.** The danger is a comparison that gives the wrong answer because
  the two sides use different value sets. At runtime a string enum member *is* its string, so
  `PermissionStatus.GRANTED === 'granted'` is true and the comparison is exactly
  `status !== PermissionStatus.GRANTED`. Even if `requestForegroundPermissionsAsync` were replaced to return
  any other value (say `{ status: 'denied' }` or `{ status: 'whatever' }`), the code takes the "not granted"
  branch, which is the intended result. With the installed `expo-modules-core`, no input makes line 33
  misjudge the status.
- **B.3 Reachable in normal execution? Yes.** First launch, the user taps Allow: `status` is
  `PermissionStatus.GRANTED`, the comparison is false, and the store becomes `'granted'`. Tapping Deny gives
  `PermissionStatus.DENIED`, the comparison is true, and the store becomes `'denied'`.
- **B.4 Can it occur in normal execution? No,** for the reason in B.2.

**Verdict:** not a bug today; a maintainability warning. It would only matter if Expo changed the enum's
string values. Fix: `if (status !== Location.PermissionStatus.GRANTED)`, which the compiler then checks.

### W3. `no-misused-promises`: `src/app/schedule/index.tsx:80`

> Promise-returning function provided to attribute where a void return was expected.

```tsx
const deleteSelected = async () => {
  const count = selected.length;
  const confirmed = await confirmAction(
    count === 1 ? 'Remove Class' : 'Remove Classes',
    `Remove ... from your schedule?`,
    'Remove'
  );
  if (!confirmed) return;
  selected.forEach(removeClass);
  finishEditing();
};
...
{isEditing ? (
  <Pressable
    disabled={selected.length === 0}
    onPress={deleteSelected}         // line 80 (L)
    ...>
```

M is the `ScheduleScreen` component. `Pressable`'s `onPress` is typed to return `void`, so React Native
throws away the Promise that `deleteSelected` returns. If that Promise ever rejects, nothing catches it.

- **B.1 Reachable? Yes.** Line 80 is evaluated on every render where `isEditing` is true. Example: open the
  Schedule tab and tap **Edit**.
- **B.2 Can the warned behavior occur? Yes, by a contrived call.** `deleteSelected` rejects if anything it
  awaits or calls throws. On web, `confirmAction` (`src/components/ui/alert.ts`) calls `window.confirm`;
  if a page script replaces it with `window.confirm = () => { throw new Error('blocked'); }`, then tapping
  Delete makes `deleteSelected` reject and, because `Pressable` discards the Promise, the browser logs
  "Uncaught (in promise) Error: blocked". The classes are not removed and the user sees nothing.
- **B.3 Reachable in normal execution? Yes.** Tap **Edit**, tap a class card to select it, tap
  **Delete (1)**: `Pressable` calls `deleteSelected` from line 80.
- **B.4 Can it occur in normal execution? No.** The real `window.confirm` returns `true` or `false` and
  does not throw (browsers that block dialogs return `false`). On native, `confirmAction` wraps
  `Alert.alert` in a Promise that only ever resolves. `removeClass` is a React state update
  (`setClasses(prev => removeClassFromSchedule(prev, id))`) and `finishEditing` sets state, neither of
  which throws. So the Promise always resolves.

**Verdict:** correct about the pattern, harmless with today's helpers. Wrapping the handler,
`onPress={() => void deleteSelected()}`, or adding a `try`/`catch` that shows an alert would make a
future failure visible.

### W4. `unbound-method`: `src/components/map/campus-map-view.tsx:136`

> A method that is not declared with `this: void` may cause unintentional scoping of `this` when separated
> from its object.

```tsx
const [tapGuard] = useState(createTapGuard);
...
usePanZoom({
  ...
  onGestureStart: tapGuard.gestureStarted,    // line 136 (L)
  onGestureEnd: handleGestureEnd,
});
```

and in `src/components/map/tap-guard.ts`:

```ts
export function createTapGuard(now = Date.now, windowMs = TAP_AFTER_GESTURE_MS) {
  let active = false;
  let lastEnd = Number.NEGATIVE_INFINITY;
  return {
    gestureStarted() { active = true; },
    gestureEnded() { active = false; lastEnd = now(); },
    shouldSuppressPress() { return active || now() - lastEnd < windowMs; },
  };
}
```

M is the `CampusMapView` component. Line 136 passes `gestureStarted` on its own, detached from `tapGuard`;
`usePanZoom` later calls it as a plain function (`scheduleOnRN(onGestureStart)`), so inside it `this` is
`undefined`. The rule warns because a method written in shorthand (`gestureStarted() {...}`) is typed as
possibly using `this`, and a method that did would then fail or update the wrong object.

- **B.1 Reachable? Yes.** Line 136 runs on every render of `CampusMapView`. Example: open the Map tab.
- **B.2 Can the warned behavior occur? No.** The behavior is wrong `this` scoping. `gestureStarted` never
  reads `this`: it assigns `active`, a local variable of `createTapGuard` captured by closure. Calling it
  detached, with any `this` (`undefined`, `globalThis`, another object via
  `tapGuard.gestureStarted.call({})`), sets the same `active` flag of the same guard. There is no call of
  `CampusMapView` for which the detached call behaves differently from `tapGuard.gestureStarted()`. The
  file's own comment says this is deliberate: "Plain closures (no `this`) so the methods can be handed
  straight to scheduleOnRN from gesture worklets."
- **B.3 Reachable in normal execution? Yes.** Opening the Map or Parking tab renders `CampusMapView`;
  dragging the map then makes `usePanZoom` call `onGestureStart`.
- **B.4 Can it occur in normal execution? No,** for the reason in B.2. A test
  (`src/components/map/__tests__/tap-guard.test.ts`) also covers the guard's behavior.

**Verdict:** a false positive. The rule only sees the type of the method shorthand, not that its body is
`this`-free. Writing the members as arrow functions (`gestureStarted: () => { active = true; }`) tells the
rule so, and also stops a future edit from adding a `this` by accident.

## Summary

| # | Warning | B.1 | B.2 | B.3 | B.4 | Good warning? |
|---|---------|-----|-----|-----|-----|---------------|
| W1 | no-floating-promises | Yes | Yes (throwing listener) | Yes | No | Pattern yes, no bug today |
| W2 | no-unsafe-enum-comparison | Yes | No | Yes | No | Maintainability only |
| W3 | no-misused-promises | Yes | Yes (throwing `confirm`) | Yes | No | Pattern yes, no bug today |
| W4 | unbound-method | Yes | No | Yes | No | False positive |
