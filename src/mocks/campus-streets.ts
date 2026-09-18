import type { CampusStreet } from '@/types/map';

/**
 * Street centerlines inside the mapped campus-core box (see CAMPUS_BOUNDS in
 * src/constants/campus.ts), digitized from the official 2019 UT Arlington
 * campus map PDF the same way campus-pois.ts buildings are. Simplified to a
 * handful of points per street (not every curve traced) -- enough for the
 * outdoor map to show the real street grid under the buildings/lots.
 *
 * Visual only -- not part of the MapNode/MapEdge routing graph.
 */
export const CAMPUS_STREETS: CampusStreet[] = [
  {
    id: 'street-s-cooper-st',
    name: 'S Cooper St',
    path: [
      { lat: 32.734063, lng: -97.115286 },
      { lat: 32.726375, lng: -97.115286 },
    ],
  },
  {
    id: 'street-s-center-st',
    name: 'S Center St',
    path: [
      { lat: 32.734063, lng: -97.106994 },
      { lat: 32.726375, lng: -97.106994 },
    ],
  },
  {
    id: 'street-uta-blvd',
    name: 'UTA Blvd',
    path: [
      { lat: 32.733938, lng: -97.115539 },
      { lat: 32.733938, lng: -97.111527 },
      { lat: 32.733938, lng: -97.106994 },
    ],
  },
  {
    id: 'street-w-mitchell-st',
    name: 'W Mitchell St',
    path: [
      { lat: 32.726587, lng: -97.115539 },
      { lat: 32.726537, lng: -97.113013 },
      { lat: 32.726487, lng: -97.111527 },
      { lat: 32.726487, lng: -97.109298 },
      { lat: 32.726562, lng: -97.106994 },
    ],
  },
  {
    id: 'street-college-st',
    name: 'College St',
    path: [
      { lat: 32.733875, lng: -97.112716 },
      { lat: 32.731937, lng: -97.112716 },
    ],
  },
  {
    id: 'street-s-west-st',
    name: 'S West St',
    path: [
      { lat: 32.733875, lng: -97.111527 },
      { lat: 32.731937, lng: -97.111527 },
    ],
  },
  {
    id: 'street-s-oak-st',
    name: 'S Oak St',
    path: [
      { lat: 32.733875, lng: -97.109001 },
      { lat: 32.726437, lng: -97.109001 },
    ],
  },
  {
    id: 'street-w-1st-st',
    name: 'W 1st St',
    path: [
      { lat: 32.732375, lng: -97.111527 },
      { lat: 32.732375, lng: -97.108406 },
    ],
  },
  {
    id: 'street-spaniolo-dr',
    name: 'Spaniolo Dr',
    path: [
      { lat: 32.732062, lng: -97.108109 },
      { lat: 32.726437, lng: -97.108109 },
    ],
  },
  {
    id: 'street-w-2nd-st',
    name: 'W 2nd St',
    path: [
      { lat: 32.73125, lng: -97.109001 },
      { lat: 32.73125, lng: -97.106994 },
    ],
  },
  {
    id: 'street-w-3rd-st',
    name: 'W 3rd St',
    path: [
      { lat: 32.72975, lng: -97.111378 },
      { lat: 32.72975, lng: -97.106994 },
    ],
  },
  {
    id: 'street-w-4th-st',
    name: 'W 4th St',
    path: [
      { lat: 32.72875, lng: -97.111601 },
      { lat: 32.72875, lng: -97.108555 },
    ],
  },
  {
    id: 'street-s-nedderman-dr',
    name: 'S Nedderman Dr',
    path: [
      { lat: 32.729687, lng: -97.111601 },
      { lat: 32.726437, lng: -97.111601 },
    ],
  },
];
