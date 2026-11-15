# Places Missing from the Map

Checked 2026-11-15: UTA Facilities' building inventory (names and codes only, no locations) against the buildings in
Mavigator. Everything here is on UTA's list but not on our map.

**Before drawing anything:** look for an unnamed outline at that spot in the Campus Digitizer. OpenStreetMap has 47
unnamed campus buildings, and naming one (plus picking its category) is faster than tracing. Then save
`map-edits.json` into `src/data/`, run `npm run import:osm` and `npm test`.

## New category: athletics and outdoor places

The category doesn't exist yet; it has to be added to the app and the Campus Digitizer first. Outdoor places are drawn
as outlines like buildings, so they can be searched, tapped and routed to.

- Maverick Stadium (STAD), plus its Scoreboard Building (SCOR) and Ticket Booths E and S (TICE, TICS) if wanted
- Clay Gould Ballpark (REST), baseball
- Women's Softball Complex (FPLX), with the Softball Clubhouse (SCH), Press Box (SPB) and Batting Cage (SBC)
- Baseball Clubhouse (BCH)
- C. R. Gilstrap Athletic Center (GILS)
- The Green at College Park (CP), and Ricchi Plaza (XRP)

Already on the map as "misc", could move to the new category (their ids change, which only matters to someone who
picked one as a start point):
- Tennis Center
- Justin D. Wilson Batting Facility (probably UTA's "Baseball Batting Cage", BBC)
- Levitt Pavilion
- Brazos Park

## Real buildings worth adding

Academic:
- CAPPA North (CMPC)
- CAPPA South A and B (SHC, SHO)
- Center for Entrepreneurship and Economic Innovation (CEEI)
- Social Work Complex A and B (SWCA, SWCB)
- UTA Community Design Build Lab (DBI)
- New Greenhouse (NG)

Administration:
- Police Annex (PA) and Police Annex Modular Building (PAM)
- Operations Center (XOCB)
- EH&S West (EHW)

Check first:
- Lipscomb Hall (LIP): an old residence hall, still listed. Is it still used?

## Probably skip

- Facilities and storage: Carpenter Shop, Electrical Shop and its storage, Compressor Building, Central Service Annex,
  Chemical Storage, Composting Center Office, Fire Control Building, Fountain Equipment Building, Grounds Storage
  Pumphouse, Grounds Warehouse, Material Accumulation Center, OFM Equipment Storage, Physical Plant Operations and
  Storage, University Storage, Control Building (Intramural)
- The parking garage elevator towers (NE, NW, SE, SW) and the Gateway Monument
- Single houses: 1214 S Pecan, 700 South Davis, Davis Street House, Greek Row House
- Leased or off-campus, by the look of them: Congress Building, Kaleido II, El Dorado Towers, Tanbic Tower, DED on
  Division, Arlington Regional Data Center, UT Arlington Research Institute, UTA-FTW at Santa Fe Station, Asphalt
  Pavement Testing Center, Christian Care Center
- YWCA Child Care Center: may be our "Transforming Lives Child Development Center"; rename ours if so

## Walkways

- Lot 49 to ERB (Blaine): the walk crosses the bridge over Mitchell Street, which may be missing from OSM. Trace it
  in the digitizer so both ends land on existing paths (a traced walkway joins any path within 12 m). The import
  report's UNROUTABLE section catches anything drawn too far from a path.
