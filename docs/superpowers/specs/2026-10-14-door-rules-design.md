# Door types: keep the model, fill three gaps

## Context

Anthony asked whether hallway doors should be rewritten as "attachments onto a hallway" that gate everything past
them, given 7-8 door types (decorative, one-way, emergency, staff, each with or without a room).

They already are. The digitizer's `gate` snaps onto the hallway (click each side), and the import
(`tools/indoor/indoor.ts` step 4, ~L891) cuts the hallway there and joins the halves with a 1 m edge carrying the
rule. Anything past the door is reachable only through that edge, so the region rule falls out of the graph.
The door types are two independent axes, not 8 kinds:

- **where**: hallway (`hallwayDoors`), room (`doors`), between rooms (`connectingDoors`), outside (`entrances`)
- **who, each way**: `anyone` / `staff` / `none` (`DOOR_RULES`)

Decorative = not traced. One-way = `anyone` + `none`. Staff = `staff`. Emergency = `none` both ways + a flag.

**Decision: no rewrite, no migration.** Fill the three gaps Anthony picked: emergency flag beyond entrances,
full each-way rules on room doors, and a bar across the hallway on the app's indoor map.

## Design

### 1. Emergency flag on hallway and room doors (`tools/indoor/indoor.ts`)
- `IndoorHallwayDoor.emergency?: boolean` and `IndoorDoor.emergency?: boolean`, same meaning as on
  `IndoorEntrance`: routes never pass, either way (overrides `pass`/`enter`/`exit`).
- Import: step 4 uses `accessOf('none', 'none')` when `emergency`; the room-door spur in `doorway()` (~L968) the same.
- Validation (~L293-L383): `checkRule`-style boolean check like entrances'.

### 2. Each-way rules on room doors
- Reuse the entrance spelling (no new concept): `IndoorDoor.enter?: DoorRule` (widened from `Exclude<..., 'none'>`)
  and new `exit?: DoorRule`, both omitted = anyone. Old files (`enter: 'staff'`) read unchanged.
- `doorway()` passes both: `spur(node, hall, false, accessOf(exit, enter))` (spur runs room -> hallway).
- Validation: drop the `['anyone', 'staff']` restriction on `enter` (~L343), check `exit` with `DOOR_RULES`.

### 3. Bar across the hallway
- Data: `IndoorHallwayDoor.span?: [IndoorPoint, IndoorPoint]`, the bar's two ends, dragged to meet the walls in the
  digitizer. When absent (every existing gate), the import uses a 2 m bar through `at`, perpendicular to the
  `sides[0] -> sides[1]` line, so no hallway lookup and no migration.
- Floor plans: `floorPlansByPoi` emits `hallwayDoors: { span: [Coordinate, Coordinate]; kind }[]` per floor, `kind`
  `'emergency' | 'closed' | 'staff' | 'oneWay'` derived from the rules. Doors that are `anyone` both ways are skipped.
  Add the field to the floor plan type in `src/types/map.ts` (~L160, required like `entrances`), and to the
  `empty` fixture in `src/routing/__tests__/floors.test.ts`.
- App: `src/components/map/indoor-layer.tsx` draws each as a thick line (`Line` from react-native-svg), colored by
  kind next to `ROOM_COLORS` (light + dark): emergency red, staff amber, closed gray, one-way blue. Above rooms,
  below labels. Skipped: a direction arrow for one-way; add it if people misread the bar.

### 4. Indoor Digitizer (`Claude outputs/indoor-digitizer/indoor-digitizer.html`, gitignored artifact)
- Gate panel: "Emergency door" checkbox; two draggable bar-end handles, defaulting to the perpendicular 2 m bar;
  exports `emergency` and `span`.
- Room-door panel: Enter / Exit selects (anyone/staff/no one) replacing the staff-only option, plus "Emergency door";
  exports `enter`/`exit`/`emergency`.
- Update `Claude outputs/INDOOR_DIGITIZER.md` (feature kinds) and republish the artifact to its existing URL.

### Docs
- CLAUDE.md "Door rules" bullet: emergency on all door kinds, room doors' `enter`/`exit`, `span` and the drawn bar.

## Tests first (`tools/indoor/__tests__/indoor.test.ts`)
- Emergency hallway door: no route across it either way, even with `pass` anyone.
- Emergency room door / `enter: 'none'`: room unreachable; `exit: 'none'`: can enter, route can't leave through it.
- Old `enter: 'staff'` file still gives a restricted inbound edge.
- `floorPlansByPoi`: default span is 2 m, perpendicular to the sides line, centered on `at`; given `span` is passed
  through; `kind` per rule combination; anyone-both-ways door omitted.

## Verification
- `npm test`, `npx tsc --noEmit`, `npx expo lint`.
- `npm run import:osm`; regenerated `campus-indoor.ts` gains `hallwayDoors` per floor and the report is otherwise unchanged.
- Dev server (`npx expo start --web`), Nedderman indoor screen: existing gates show as bars across the corridor
  in both themes.
- Digitizer: place a gate, drag bar ends, mark emergency, set a room door's exit to "no one", export, re-import.
