import type { IndoorBuildingData } from '@/types/map';

/**
 * GENERATED FILE -- do not edit by hand. Rebuild with `npm run import:osm`.
 * Built from src/data/indoor-edits.json, traced in the Indoor Digitizer.
 *
 * Which buildings have an indoor map, and how to load one (src/data/indoor/<poiId>.ts: its
 * hallways, doors, stairs and floor plans). `links`: buildings a door leads straight into.
 * `amenities`: the items it has (vending, water, restroom-men...), so "nearest" loads only those.
 * Load through src/routing/campus-graph.ts, not directly.
 */
export const INDOOR_BUILDINGS: Record<string, { links: string[]; amenities?: string[]; load: () => Promise<{ default: IndoorBuildingData }> }> = {
  'academic-aerodynamics-research-building': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-aerodynamics-research-building') },
  'academic-amphibian-and-reptile-diversity-research-center': { links: [], load: () => import('./indoor/academic-amphibian-and-reptile-diversity-research-center') },
  'academic-business-building': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-business-building') },
  'academic-cappa-building': { links: [], load: () => import('./indoor/academic-cappa-building') },
  'academic-carlisle-hall': { links: [], load: () => import('./indoor/academic-carlisle-hall') },
  'academic-central-library': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-central-library') },
  'academic-chemistry-physics-building': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-chemistry-physics-building') },
  'academic-chemistry-research-building': { links: [], load: () => import('./indoor/academic-chemistry-research-building') },
  'academic-civil-engineering-laboratory-building': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-civil-engineering-laboratory-building') },
  'academic-college-hall': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-college-hall') },
  'academic-earth-and-environmental-sciences': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-earth-and-environmental-sciences') },
  'academic-engineering-lab-building': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-engineering-lab-building') },
  'academic-engineering-research-building': { links: [], amenities: ['restroom-all', 'restroom-men', 'restroom-women'], load: () => import('./indoor/academic-engineering-research-building') },
  'academic-environmental-health-and-safety': { links: [], load: () => import('./indoor/academic-environmental-health-and-safety') },
  'academic-fine-arts-building': { links: [], amenities: ['restroom-men', 'restroom-women', 'vending'], load: () => import('./indoor/academic-fine-arts-building') },
  'academic-general-academic-classroom-building': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-general-academic-classroom-building') },
  'academic-hammond-hall': { links: ['academic-trimble-hall'], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-hammond-hall') },
  'academic-health-center': { links: [], load: () => import('./indoor/academic-health-center') },
  'academic-library-collections-depository': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-library-collections-depository') },
  'academic-life-science-building': { links: [], load: () => import('./indoor/academic-life-science-building') },
  'academic-maverick-activities-center': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-maverick-activities-center') },
  'academic-nanotech-building': { links: [], load: () => import('./indoor/academic-nanotech-building') },
  'academic-nedderman-hall': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-nedderman-hall') },
  'academic-physical-education-building': { links: [], amenities: ['restroom-all', 'restroom-men'], load: () => import('./indoor/academic-physical-education-building') },
  'academic-pickard-hall': { links: [], amenities: ['restroom-men', 'restroom-women', 'study'], load: () => import('./indoor/academic-pickard-hall') },
  'academic-preston-hall': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-preston-hall') },
  'academic-ransom-hall': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-ransom-hall') },
  'academic-school-of-social-work-and-smart-hospital': { links: [], load: () => import('./indoor/academic-school-of-social-work-and-smart-hospital') },
  'academic-science-hall': { links: [], load: () => import('./indoor/academic-science-hall') },
  'academic-seir-building': { links: [], load: () => import('./indoor/academic-seir-building') },
  'academic-studio-arts-center': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-studio-arts-center') },
  'academic-swift-center': { links: [], load: () => import('./indoor/academic-swift-center') },
  'academic-thermal-energy-plant': { links: [], load: () => import('./indoor/academic-thermal-energy-plant') },
  'academic-trimble-hall': { links: ['academic-hammond-hall'], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-trimble-hall') },
  'academic-university-center': { links: [], amenities: ['other', 'restroom-men', 'restroom-women'], load: () => import('./indoor/academic-university-center') },
  'academic-university-hall': { links: [], amenities: ['restroom-men', 'restroom-women', 'vending'], load: () => import('./indoor/academic-university-hall') },
  'academic-wetsel-building': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-wetsel-building') },
  'academic-woolf-hall': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/academic-woolf-hall') },
  'administration-dan-dipert-welcome-center': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/administration-dan-dipert-welcome-center') },
  'administration-texas-hall': { links: [], load: () => import('./indoor/administration-texas-hall') },
  'administration-trinity-hall': { links: [], load: () => import('./indoor/administration-trinity-hall') },
  'administration-university-administration-building': { links: [], load: () => import('./indoor/administration-university-administration-building') },
  'administration-uta-police-department': { links: [], amenities: ['restroom-men', 'restroom-women'], load: () => import('./indoor/administration-uta-police-department') },
  'apartment-the-heights-on-pecan': { links: [], load: () => import('./indoor/apartment-the-heights-on-pecan') },
  'apartment-the-lofts': { links: [], load: () => import('./indoor/apartment-the-lofts') },
  'misc-college-park-center': { links: [], load: () => import('./indoor/misc-college-park-center') },
  'residence-arlington-hall': { links: [], amenities: ['study', 'vending'], load: () => import('./indoor/residence-arlington-hall') },
  'residence-kalpana-chawla-hall': { links: [], load: () => import('./indoor/residence-kalpana-chawla-hall') },
  'residence-vandergriff-hall': { links: [], load: () => import('./indoor/residence-vandergriff-hall') },
  'residence-west-hall': { links: [], load: () => import('./indoor/residence-west-hall') },
};
