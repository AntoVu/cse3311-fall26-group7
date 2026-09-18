import type { CampusLot } from '@/types/map';

/**
 * Parking lot/garage footprints inside the mapped campus-core box (see
 * CAMPUS_BOUNDS in src/constants/campus.ts). Digitized from the official
 * 2019 UT Arlington campus map PDF the same way campus-pois.ts buildings
 * are -- labels are the lot/garage codes as printed on that map ("Lot 47",
 * "Lot F12 Garage", etc), not expanded names, since the map itself does
 * not spell most of them out.
 *
 * Visual/ground-truth only -- not wired into the Parking tab's mock data
 * (src/mocks/parking.ts) or any routing graph. The two F10 lots share a
 * label because the map draws them as one lot split by a driveway.
 */
export const CAMPUS_LOTS: CampusLot[] = [
  {
    id: 'lot-f14',
    label: 'Lot F14',
    coordinate: { lat: 32.733313, lng: -97.114982 },
    footprint: [
      { lat: 32.73375, lng: -97.115242 },
      { lat: 32.73375, lng: -97.114722 },
      { lat: 32.732875, lng: -97.114722 },
      { lat: 32.732875, lng: -97.115242 },
    ],
  },
  {
    id: 'lot-f12',
    label: 'Lot F12 Garage',
    coordinate: { lat: 32.733219, lng: -97.11149 },
    footprint: [
      { lat: 32.733875, lng: -97.112195 },
      { lat: 32.733875, lng: -97.110784 },
      { lat: 32.732563, lng: -97.110784 },
      { lat: 32.732563, lng: -97.112195 },
    ],
  },
  {
    id: 'lot-f11',
    label: 'Lot F11',
    coordinate: { lat: 32.733125, lng: -97.109558 },
    footprint: [
      { lat: 32.733875, lng: -97.110709 },
      { lat: 32.733875, lng: -97.108406 },
      { lat: 32.732375, lng: -97.108406 },
      { lat: 32.732375, lng: -97.110709 },
    ],
  },
  {
    id: 'lot-38',
    label: 'Lot 38',
    coordinate: { lat: 32.732813, lng: -97.107812 },
    footprint: [
      { lat: 32.733313, lng: -97.108332 },
      { lat: 32.733313, lng: -97.107292 },
      { lat: 32.732312, lng: -97.107292 },
      { lat: 32.732312, lng: -97.108332 },
    ],
  },
  {
    id: 'lot-39',
    label: 'Lot 39',
    coordinate: { lat: 32.732844, lng: -97.107292 },
    footprint: [
      { lat: 32.733375, lng: -97.107515 },
      { lat: 32.733375, lng: -97.107069 },
      { lat: 32.732312, lng: -97.107069 },
      { lat: 32.732312, lng: -97.107515 },
    ],
  },
  {
    id: 'lot-mg',
    label: 'Maverick Parking Garage',
    coordinate: { lat: 32.728562, lng: -97.110672 },
    footprint: [
      { lat: 32.72875, lng: -97.111601 },
      { lat: 32.72875, lng: -97.109744 },
      { lat: 32.728375, lng: -97.109744 },
      { lat: 32.728375, lng: -97.111601 },
    ],
  },
  {
    id: 'lot-pn',
    label: 'PN Garage',
    coordinate: { lat: 32.733594, lng: -97.107403 },
    footprint: [
      { lat: 32.733938, lng: -97.107737 },
      { lat: 32.733938, lng: -97.107069 },
      { lat: 32.73325, lng: -97.107069 },
      { lat: 32.73325, lng: -97.107737 },
    ],
  },
  {
    id: 'lot-pc',
    label: 'PC Garage',
    coordinate: { lat: 32.732813, lng: -97.107403 },
    footprint: [
      { lat: 32.733188, lng: -97.107737 },
      { lat: 32.733188, lng: -97.107069 },
      { lat: 32.732437, lng: -97.107069 },
      { lat: 32.732437, lng: -97.107737 },
    ],
  },
  {
    id: 'lot-ps',
    label: 'PS Garage',
    coordinate: { lat: 32.7315, lng: -97.107403 },
    footprint: [
      { lat: 32.731875, lng: -97.107737 },
      { lat: 32.731875, lng: -97.107069 },
      { lat: 32.731125, lng: -97.107069 },
      { lat: 32.731125, lng: -97.107737 },
    ],
  },
  {
    id: 'lot-cpw',
    label: 'Lot CPW',
    coordinate: { lat: 32.728906, lng: -97.108109 },
    footprint: [
      { lat: 32.729375, lng: -97.108778 },
      { lat: 32.729375, lng: -97.10744 },
      { lat: 32.728437, lng: -97.10744 },
      { lat: 32.728437, lng: -97.108778 },
    ],
  },
  {
    id: 'lot-cn',
    label: 'Lot CN',
    coordinate: { lat: 32.727875, lng: -97.108146 },
    footprint: [
      { lat: 32.728312, lng: -97.108629 },
      { lat: 32.728312, lng: -97.107663 },
      { lat: 32.727437, lng: -97.107663 },
      { lat: 32.727437, lng: -97.108629 },
    ],
  },
  {
    id: 'lot-cs',
    label: 'Lot CS',
    coordinate: { lat: 32.726594, lng: -97.108035 },
    footprint: [
      { lat: 32.726937, lng: -97.108555 },
      { lat: 32.726937, lng: -97.107515 },
      { lat: 32.72625, lng: -97.107515 },
      { lat: 32.72625, lng: -97.108555 },
    ],
  },
  {
    id: 'lot-47',
    label: 'Lot 47',
    coordinate: { lat: 32.726906, lng: -97.112307 },
    footprint: [
      { lat: 32.727375, lng: -97.113087 },
      { lat: 32.727375, lng: -97.111527 },
      { lat: 32.726437, lng: -97.111527 },
      { lat: 32.726437, lng: -97.113087 },
    ],
  },
  {
    id: 'lot-f10-n',
    label: 'Lot F10',
    coordinate: { lat: 32.727906, lng: -97.110375 },
    footprint: [
      { lat: 32.728312, lng: -97.111378 },
      { lat: 32.728312, lng: -97.109372 },
      { lat: 32.7275, lng: -97.109372 },
      { lat: 32.7275, lng: -97.111378 },
    ],
  },
  {
    id: 'lot-f10-s',
    label: 'Lot F10',
    coordinate: { lat: 32.726937, lng: -97.110375 },
    footprint: [
      { lat: 32.727437, lng: -97.111378 },
      { lat: 32.727437, lng: -97.109372 },
      { lat: 32.726437, lng: -97.109372 },
      { lat: 32.726437, lng: -97.111378 },
    ],
  },
];
