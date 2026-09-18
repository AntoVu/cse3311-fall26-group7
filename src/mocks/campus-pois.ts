import type { PointOfInterest } from '@/types/map';

/**
 * POIs for Iteration 1's outdoor Map tab.
 *
 * The academic + residence buildings below cover the campus-core box the team
 * asked to get mapped accurately (bounded by S Cooper St / UTA Blvd /
 * S Center St / W Mitchell St -- see CAMPUS_BOUNDS in src/constants/campus.ts
 * for how). Every one of them -- name, building code, position, and footprint
 * shape -- is digitized from the official 2019 UT Arlington campus map PDF
 * (uta.edu/pats/_documents/UT Arlington Campus Map.pdf), not invented.
 * Positions are proportionally accurate to that source; see the comment on
 * CAMPUS_BOUNDS for the (small, expected) absolute-GPS caveat. Footprints are
 * simplified rectangles/polygons, not every jag of the real building traced,
 * so adjacent buildings may show a few feet of visual overlap in a couple of
 * tightly-packed spots (e.g. the 501/505/581 cluster) -- positions and
 * relative layout are still correct.
 *
 * CORRECTION from the original Iteration 1 mock data: "Maverick Hall",
 * "Vandergriff Hall", and "West Hall" (previously listed as on-campus
 * residence halls) do not appear anywhere in the official map's building
 * index and have been removed -- they don't seem to be real UTA buildings
 * (the map's "MAC" near Greek Row is the Maverick ACTIVITIES Center, a
 * recreation building, not a dorm called "Maverick Hall"). The team should
 * flag this if those names came from somewhere specific, but until then
 * treat them as mistaken. The four real on-campus dorms inside this box are
 * Arlington Hall, Trimble Hall, Hammond Hall, and Kalpana Chawla Hall, all
 * below. There may be more dorms outside this box (uncropped part of the
 * official map) -- not yet digitized.
 */
export const CAMPUS_POIS: PointOfInterest[] = [
  // Academic / institutional buildings
  {
    id: 'academic-ransom-hall',
    name: 'Ransom Hall',
    category: 'academic',
    buildingCode: '501',
    coordinate: { lat: 32.73075, lng: -97.11253 },
    footprint: [
      { lat: 32.731, lng: -97.113087 },
      { lat: 32.731, lng: -97.111973 },
      { lat: 32.7305, lng: -97.111973 },
      { lat: 32.7305, lng: -97.113087 },
    ],
  },
  {
    id: 'academic-preston-hall',
    name: 'Preston Hall',
    category: 'academic',
    buildingCode: '502',
    coordinate: { lat: 32.730625, lng: -97.113533 },
    footprint: [
      { lat: 32.730875, lng: -97.113904 },
      { lat: 32.730875, lng: -97.113161 },
      { lat: 32.730375, lng: -97.113161 },
      { lat: 32.730375, lng: -97.113904 },
    ],
  },
  {
    id: 'academic-college-hall',
    name: 'College Hall',
    category: 'academic',
    buildingCode: '505',
    coordinate: { lat: 32.73075, lng: -97.111304 },
    footprint: [
      { lat: 32.731, lng: -97.111824 },
      { lat: 32.731, lng: -97.110784 },
      { lat: 32.7305, lng: -97.110784 },
      { lat: 32.7305, lng: -97.111824 },
    ],
  },
  {
    id: 'academic-engineering-research-building',
    name: 'Engineering Research Building',
    category: 'academic',
    buildingCode: '510',
    coordinate: { lat: 32.733344, lng: -97.113607 },
    footprint: [
      { lat: 32.73375, lng: -97.114499 },
      { lat: 32.73375, lng: -97.112716 },
      { lat: 32.732938, lng: -97.112716 },
      { lat: 32.732938, lng: -97.114499 },
    ],
  },
  {
    id: 'academic-geoscience',
    name: 'Geoscience',
    category: 'academic',
    buildingCode: '513',
    coordinate: { lat: 32.7315, lng: -97.114722 },
    footprint: [
      { lat: 32.731875, lng: -97.115316 },
      { lat: 32.731875, lng: -97.114127 },
      { lat: 32.731125, lng: -97.114127 },
      { lat: 32.731125, lng: -97.115316 },
    ],
  },
  {
    id: 'academic-science-hall',
    name: 'Science Hall',
    category: 'academic',
    buildingCode: '518',
    coordinate: { lat: 32.730594, lng: -97.114684 },
    footprint: [
      { lat: 32.731125, lng: -97.115316 },
      { lat: 32.731125, lng: -97.114053 },
      { lat: 32.730062, lng: -97.114053 },
      { lat: 32.730062, lng: -97.115316 },
    ],
  },
  {
    id: 'academic-baker-chemistry-research-building',
    name: 'W.A. Baker Chemistry Research Building',
    category: 'academic',
    buildingCode: '519',
    coordinate: { lat: 32.730125, lng: -97.11331 },
    footprint: [
      { lat: 32.730375, lng: -97.113904 },
      { lat: 32.730375, lng: -97.112716 },
      { lat: 32.729875, lng: -97.112716 },
      { lat: 32.729875, lng: -97.113904 },
    ],
  },
  {
    id: 'academic-chemistry-physics-building',
    name: 'Chemistry & Physics Building',
    category: 'academic',
    buildingCode: '520',
    coordinate: { lat: 32.730125, lng: -97.11201 },
    footprint: [
      { lat: 32.730375, lng: -97.112716 },
      { lat: 32.730375, lng: -97.111304 },
      { lat: 32.729875, lng: -97.111304 },
      { lat: 32.729875, lng: -97.112716 },
    ],
  },
  {
    id: 'academic-uc-hereford-university-center',
    name: '(UC) E.H. Hereford University Center',
    category: 'academic',
    buildingCode: '525',
    coordinate: { lat: 32.731469, lng: -97.111081 },
    footprint: [
      { lat: 32.731937, lng: -97.11279 },
      { lat: 32.731937, lng: -97.110264 },
      { lat: 32.731562, lng: -97.110264 },
      { lat: 32.731562, lng: -97.110041 },
      { lat: 32.731312, lng: -97.110041 },
      { lat: 32.731312, lng: -97.11123 },
      { lat: 32.731062, lng: -97.11123 },
      { lat: 32.731062, lng: -97.11279 },
    ],
  },
  {
    id: 'academic-science-engineering-innovation-research-building',
    name: 'Science Engineering Innovation and Research Building',
    category: 'academic',
    buildingCode: '533',
    coordinate: { lat: 32.727287, lng: -97.114053 },
    footprint: [
      { lat: 32.727812, lng: -97.115167 },
      { lat: 32.727812, lng: -97.113013 },
      { lat: 32.727187, lng: -97.113013 },
      { lat: 32.726687, lng: -97.113904 },
      { lat: 32.726937, lng: -97.115167 },
    ],
  },
  {
    id: 'academic-brazos-pavilion',
    name: 'Brazos Pavilion',
    category: 'academic',
    buildingCode: '581',
    coordinate: { lat: 32.730719, lng: -97.111044 },
    footprint: [
      { lat: 32.731, lng: -97.111378 },
      { lat: 32.731, lng: -97.110709 },
      { lat: 32.730437, lng: -97.110709 },
      { lat: 32.730437, lng: -97.111378 },
    ],
  },
  {
    id: 'academic-lipscomb-hall',
    name: 'Lipscomb Hall',
    category: 'academic',
    buildingCode: '595',
    coordinate: { lat: 32.728812, lng: -97.107403 },
    footprint: [
      { lat: 32.729062, lng: -97.107737 },
      { lat: 32.729062, lng: -97.107069 },
      { lat: 32.728562, lng: -97.107069 },
      { lat: 32.728562, lng: -97.107737 },
    ],
  },
  {
    id: 'academic-woolf-hall',
    name: 'Woolf Hall',
    category: 'academic',
    buildingCode: '597',
    coordinate: { lat: 32.7315, lng: -97.113459 },
    footprint: [
      { lat: 32.731937, lng: -97.11383 },
      { lat: 32.731937, lng: -97.113087 },
      { lat: 32.731062, lng: -97.113087 },
      { lat: 32.731062, lng: -97.11383 },
    ],
  },
  {
    id: 'academic-library',
    name: 'Library',
    category: 'academic',
    buildingCode: '603',
    coordinate: { lat: 32.729437, lng: -97.114684 },
    footprint: [
      { lat: 32.729875, lng: -97.115316 },
      { lat: 32.729875, lng: -97.114053 },
      { lat: 32.729, lng: -97.114053 },
      { lat: 32.729, lng: -97.115316 },
    ],
  },
  {
    id: 'academic-health-center',
    name: 'Health Center',
    category: 'academic',
    buildingCode: '609',
    coordinate: { lat: 32.730094, lng: -97.111044 },
    footprint: [
      { lat: 32.73025, lng: -97.111304 },
      { lat: 32.73025, lng: -97.110784 },
      { lat: 32.729937, lng: -97.110784 },
      { lat: 32.729937, lng: -97.111304 },
    ],
  },
  {
    id: 'academic-carlisle-hall',
    name: 'Carlisle Hall',
    category: 'academic',
    buildingCode: '626',
    coordinate: { lat: 32.730356, lng: -97.113607 },
    footprint: [
      { lat: 32.7305, lng: -97.113904 },
      { lat: 32.7305, lng: -97.11331 },
      { lat: 32.730212, lng: -97.11331 },
      { lat: 32.730212, lng: -97.113904 },
    ],
  },
  {
    id: 'academic-life-science-building',
    name: 'Life Science Building',
    category: 'academic',
    buildingCode: '627',
    coordinate: { lat: 32.727406, lng: -97.113459 },
    footprint: [
      { lat: 32.72775, lng: -97.114499 },
      { lat: 32.72775, lng: -97.112418 },
      { lat: 32.727062, lng: -97.112418 },
      { lat: 32.727062, lng: -97.114499 },
    ],
  },
  {
    id: 'academic-university-hall',
    name: 'University Hall',
    category: 'academic',
    buildingCode: '629',
    coordinate: { lat: 32.728031, lng: -97.114239 },
    footprint: [
      { lat: 32.728312, lng: -97.114722 },
      { lat: 32.728312, lng: -97.113756 },
      { lat: 32.72775, lng: -97.113756 },
      { lat: 32.72775, lng: -97.114722 },
    ],
  },
  {
    id: 'academic-engineering-lab-building',
    name: 'Engineering Lab Building',
    category: 'academic',
    buildingCode: '648',
    coordinate: { lat: 32.73225, lng: -97.112976 },
    footprint: [
      { lat: 32.732563, lng: -97.113904 },
      { lat: 32.732563, lng: -97.112047 },
      { lat: 32.731937, lng: -97.112047 },
      { lat: 32.731937, lng: -97.113904 },
    ],
  },
  {
    id: 'academic-cob-business-building',
    name: '(COB) Business Building',
    category: 'academic',
    buildingCode: '649',
    coordinate: { lat: 32.729125, lng: -97.109001 },
    footprint: [
      { lat: 32.7295, lng: -97.109446 },
      { lat: 32.7295, lng: -97.108555 },
      { lat: 32.72875, lng: -97.108555 },
      { lat: 32.72875, lng: -97.109446 },
    ],
  },
  {
    id: 'academic-pickard-hall',
    name: 'Pickard Hall',
    category: 'academic',
    buildingCode: '660',
    coordinate: { lat: 32.72775, lng: -97.111923 },
    footprint: [
      { lat: 32.728125, lng: -97.11227 },
      { lat: 32.72775, lng: -97.11123 },
      { lat: 32.727375, lng: -97.11227 },
    ],
  },
  {
    id: 'academic-thermal-energy-plant',
    name: 'Thermal Energy Plant',
    category: 'academic',
    buildingCode: '665',
    coordinate: { lat: 32.730312, lng: -97.110264 },
    footprint: [
      { lat: 32.730687, lng: -97.110709 },
      { lat: 32.730687, lng: -97.109818 },
      { lat: 32.729937, lng: -97.109818 },
      { lat: 32.729937, lng: -97.110709 },
    ],
  },
  {
    id: 'academic-nedderman-hall',
    name: 'Nedderman Hall',
    category: 'academic',
    buildingCode: '677',
    coordinate: { lat: 32.732598, lng: -97.113815 },
    footprint: [
      { lat: 32.733063, lng: -97.114722 },
      { lat: 32.733113, lng: -97.113607 },
      { lat: 32.732938, lng: -97.113013 },
      { lat: 32.731937, lng: -97.113013 },
      { lat: 32.731937, lng: -97.114722 },
    ],
  },
  {
    id: 'academic-bs-building',
    name: 'BS Building',
    category: 'academic',
    buildingCode: 'BS',
    coordinate: { lat: 32.733656, lng: -97.10822 },
    footprint: [
      { lat: 32.733875, lng: -97.108629 },
      { lat: 32.733875, lng: -97.107812 },
      { lat: 32.733438, lng: -97.107812 },
      { lat: 32.733438, lng: -97.108629 },
    ],
  },

  // On-campus residence halls
  {
    id: 'residence-trimble-hall',
    name: 'Trimble Hall',
    category: 'residence',
    buildingCode: '619',
    coordinate: { lat: 32.7295, lng: -97.111192 },
    footprint: [
      { lat: 32.72975, lng: -97.112195 },
      { lat: 32.72975, lng: -97.110189 },
      { lat: 32.72925, lng: -97.110189 },
      { lat: 32.72925, lng: -97.112195 },
    ],
  },
  {
    id: 'residence-hammond-hall',
    name: 'Hammond Hall',
    category: 'residence',
    buildingCode: '620',
    coordinate: { lat: 32.728969, lng: -97.111155 },
    footprint: [
      { lat: 32.729187, lng: -97.111601 },
      { lat: 32.729187, lng: -97.110709 },
      { lat: 32.72875, lng: -97.110709 },
      { lat: 32.72875, lng: -97.111601 },
    ],
  },
  {
    id: 'residence-kalpana-chawla-hall',
    name: 'Kalpana Chawla Hall',
    category: 'residence',
    buildingCode: '697',
    coordinate: { lat: 32.727437, lng: -97.108889 },
    footprint: [
      { lat: 32.72825, lng: -97.109372 },
      { lat: 32.72825, lng: -97.108406 },
      { lat: 32.726625, lng: -97.108406 },
      { lat: 32.726625, lng: -97.109372 },
    ],
  },
  {
    id: 'residence-arlington-hall',
    name: 'Arlington Hall',
    category: 'residence',
    buildingCode: '701',
    coordinate: { lat: 32.731531, lng: -97.108963 },
    footprint: [
      { lat: 32.732, lng: -97.109744 },
      { lat: 32.732, lng: -97.108183 },
      { lat: 32.731062, lng: -97.108183 },
      { lat: 32.731062, lng: -97.109744 },
    ],
  },

  // Nearby UTA Blvd apartments (off-campus, per User Story US-04).
  // NOTE: these sit north of UTA Blvd, outside the Cooper/UTA Blvd/Center/
  // Mitchell box that is now digitized above -- still illustrative
  // coordinates, not checked against the official map or a survey.
  {
    id: 'apartment-campus-edge-uta-blvd',
    name: 'Campus Edge on UTA Boulevard',
    category: 'apartment',
    description: 'Off-campus student housing on UTA Boulevard.',
    coordinate: { lat: 32.729, lng: -97.108 },
  },
  {
    id: 'apartment-midtown-urban',
    name: 'Midtown Urban',
    category: 'apartment',
    description: 'Off-campus student housing on UTA Boulevard.',
    coordinate: { lat: 32.7285, lng: -97.1065 },
  },
];
