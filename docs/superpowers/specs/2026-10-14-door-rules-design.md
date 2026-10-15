# Door rules on every kind of door

## Context

Anthony wants hallway gates (already built: the digitizer's "Hallway door with a rule", cut into the hallway by
the import, gating everything past it) plus the ability to mark **every kind of door** (room, restroom, stairs,
elevator, between rooms, outside) as one-way, emergency, staff-only, etc., choosing the rule for each direction.

Door rules are two independent things: **where** the door is, and **who may pass each way**
(`anyone` / `staff` / `none`, `DOOR_RULES`). Decorative doors are not traced. One-way = `anyone` one way, `none` the
other. Emergency = a flag meaning routes never pass, either way.

Today only some doors take rules:

| Door | Today | After |
|---|---|---|
| Hallway gate (`hallwayDoors`) | `pass` both ways | + `emergency` |
| Between rooms (`connectingDoors`) | `pass` both ways | + `emergency` |
| Outside (`entrances`) | `enter`/`exit`/`emergency` | unchanged |
| Room (`doors`) | `enter: 'staff'` only | `enter`/`exit`/`emergency` |
| Restroom (`restrooms`) | none | `enter`/`exit`/`emergency` |
| Stairs/elevator door (`connectors[].entrances`) | none | `enter`/`exit`/`emergency`, per door |

**Out of scope:** drawing doors on the app's indoor map (rules affect routing only; the digitizer shows them), any
change to how gates attach, and any migration: every new field is optional and omitted means anyone, so existing
files import unchanged.

## Design (`tools/indoor/indoor.ts`)

### One shape for a door into a space
- `type DoorAccess = { enter?: DoorRule; exit?: DoorRule; emergency?: boolean }`. `enter` = from the hallway into
  the room / restroom / stairwell / building; `exit` = back out. `IndoorEntrance` already has these fields.
- `IndoorDoor` and `IndoorRestroom` gain `DoorAccess` (`IndoorDoor.enter` widens to `DoorRule`; old
  `enter: 'staff'` reads the same).
- `doorRules(access: DoorAccess): { enter, exit } | null`: `entranceRules` generalized (null when `emergency` or
  `none` both ways); `entranceRules` keeps handling the old `exitOnly`, then calls it.

### Stairs and elevator doors
- `IndoorConnector.entrances` items may be a point (as today) or `{ at: IndoorPoint } & DoorAccess`.
  `connectorEntrances` keeps returning points (its callers, including `floorPlansByPoi`, don't change); a new
  `connectorDoors(connector, floor): { at, access }[]` returns both, used by the graph build.
- The rule rides on that entrance's spur (hallway <-> stairwell). An emergency or `none`-both-ways door is skipped
  (nothing attached), like an emergency entrance; if it is the flight's own door, that floor can't board the flight
  from the hallway, which is correct for an alarmed stairwell.

### Graph build
- `doorway()` (~L968) takes a `DoorAccess` instead of `enter`: returns null (with no problem reported) when
  `doorRules` is null, else `spur(node, hall, false, accessOf(exit, enter))` (spur runs room -> hallway).
- A doorway onto an **open area** gets a node of its own inside with the rule on its spur, the way entrances do
  (~L1033), because area edges carry no rule. Today a room door onto a commons silently drops its rule.
- Room doors, restrooms and connector doors (flight spur at ~L1063 and the extra doors at ~L1066) all pass their
  access through.
- `hallwayDoors` / `connectingDoors` with `emergency`: no edge across (the gate leaves the hallway cut; the
  connecting door adds no spurs).

### Validation (~L293-L430)
- `enter`/`exit` checked against `DOOR_RULES` on doors, restrooms and object-form connector entrances; `emergency`
  must be boolean wherever it appears; an object-form connector entrance needs a `{ lat, lng }` `at`.
- Drop the `['anyone', 'staff']` restriction on room doors' `enter` (~L343).

### Indoor Digitizer (`Claude outputs/indoor-digitizer/indoor-digitizer.html`, gitignored artifact)
- One shared "Who may pass" block (Enter / Exit selects: anyone, staff, no one; "Emergency door" checkbox) on the
  room-door, restroom and stair/elevator-entrance panels; the gate and between-rooms panels get the checkbox next
  to their A->B / B->A selects.
- Draw a door with a rule the way gates are drawn (warn color, arrow per allowed way, dashed for staff, red X for
  emergency) so marked doors are visible while tracing.
- Export the new fields only when set, so untouched doors stay byte-identical. Update
  `Claude outputs/INDOOR_DIGITIZER.md` and republish the artifact to its existing URL.

### Docs
- CLAUDE.md "Door rules" section: the table above in prose, `DoorAccess`, and connector entrances' object form.

## Tests first (`tools/indoor/__tests__/indoor.test.ts`)
- Room door `exit: 'none'`: route reaches the room; a route starting in it can't leave by that door.
- Room door `enter: 'none'` or `emergency`: room unreachable; old `enter: 'staff'`: restricted inbound edge.
- Restroom `enter: 'staff'`: `staffOnly`-style restricted edge.
- Stair door `emergency` on floor 2: the flight is unreachable from floor 2's hallway, still usable between the
  other floors; point-form entrances behave as before.
- Room door onto an open area keeps its rule (new inner node).
- Gate and connecting door with `emergency`: no way across, even with `pass` anyone.
- Validation rejects a bad `exit`, a non-boolean `emergency`, an object entrance with no `at`.

## Verification
- `npm test`, `npx tsc --noEmit`, `npx expo lint`.
- `npm run import:osm` with the current `indoor-edits.json`: `campus-indoor.ts` unchanged (no rules set yet).
- Digitizer: mark a stair door emergency, a restroom staff-only and a room door one-way; export; re-import; check
  the edges' `access` in `campus-indoor.ts` and a route on the dev server that would have used them.
