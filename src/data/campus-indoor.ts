import type { IndoorBuildingData } from '@/types/map';

/**
 * GENERATED FILE -- do not edit by hand. Rebuild with `npm run import:osm`.
 * Built from src/data/indoor-edits.json, traced in the Indoor Digitizer.
 *
 * Which buildings have an indoor map, and how to load one (src/data/indoor/<poiId>.ts: its
 * hallways, doors, stairs and floor plans). `links`: buildings a door leads straight into.
 * Load through src/routing/campus-graph.ts, not directly.
 */
export const INDOOR_BUILDINGS: Record<string, { links: string[]; load: () => Promise<{ default: IndoorBuildingData }> }> = {
  'academic-aerodynamics-research-building': { links: [], load: () => import('./indoor/academic-aerodynamics-research-building') },
  'academic-amphibian-and-reptile-diversity-research-center': { links: [], load: () => import('./indoor/academic-amphibian-and-reptile-diversity-research-center') },
  'academic-business-building': { links: [], load: () => import('./indoor/academic-business-building') },
  'academic-cappa-building': { links: [], load: () => import('./indoor/academic-cappa-building') },
  'academic-carlisle-hall': { links: [], load: () => import('./indoor/academic-carlisle-hall') },
  'academic-central-library': { links: [], load: () => import('./indoor/academic-central-library') },
  'academic-chemistry-physics-building': { links: [], load: () => import('./indoor/academic-chemistry-physics-building') },
  'academic-chemistry-research-building': { links: [], load: () => import('./indoor/academic-chemistry-research-building') },
  'academic-civil-engineering-laboratory-building': { links: [], load: () => import('./indoor/academic-civil-engineering-laboratory-building') },
  'academic-college-hall': { links: [], load: () => import('./indoor/academic-college-hall') },
  'academic-earth-and-environmental-sciences': { links: [], load: () => import('./indoor/academic-earth-and-environmental-sciences') },
  'academic-engineering-lab-building': { links: [], load: () => import('./indoor/academic-engineering-lab-building') },
  'academic-engineering-research-building': { links: [], load: () => import('./indoor/academic-engineering-research-building') },
  'academic-environmental-health-and-safety': { links: [], load: () => import('./indoor/academic-environmental-health-and-safety') },
  'academic-fine-arts-building': { links: [], load: () => import('./indoor/academic-fine-arts-building') },
  'academic-general-academic-classroom-building': { links: [], load: () => import('./indoor/academic-general-academic-classroom-building') },
  'academic-hammond-hall': { links: ['academic-trimble-hall'], load: () => import('./indoor/academic-hammond-hall') },
  'academic-health-center': { links: [], load: () => import('./indoor/academic-health-center') },
  'academic-library-collections-depository': { links: [], load: () => import('./indoor/academic-library-collections-depository') },
  'academic-life-science-building': { links: [], load: () => import('./indoor/academic-life-science-building') },
  'academic-maverick-activities-center': { links: [], load: () => import('./indoor/academic-maverick-activities-center') },
  'academic-nanotech-building': { links: [], load: () => import('./indoor/academic-nanotech-building') },
  'academic-nedderman-hall': { links: [], load: () => import('./indoor/academic-nedderman-hall') },
  'academic-physical-education-building': { links: [], load: () => import('./indoor/academic-physical-education-building') },
  'academic-pickard-hall': { links: [], load: () => import('./indoor/academic-pickard-hall') },
  'academic-preston-hall': { links: [], load: () => import('./indoor/academic-preston-hall') },
  'academic-ransom-hall': { links: [], load: () => import('./indoor/academic-ransom-hall') },
  'academic-science-hall': { links: [], load: () => import('./indoor/academic-science-hall') },
  'academic-seir-building': { links: [], load: () => import('./indoor/academic-seir-building') },
  'academic-studio-arts-center': { links: [], load: () => import('./indoor/academic-studio-arts-center') },
  'academic-swift-center': { links: [], load: () => import('./indoor/academic-swift-center') },
  'academic-swsh-uta-school-of-social-work-conhi-smart-hospital': { links: [], load: () => import('./indoor/academic-swsh-uta-school-of-social-work-conhi-smart-hospital') },
  'academic-thermal-energy-plant': { links: [], load: () => import('./indoor/academic-thermal-energy-plant') },
  'academic-trimble-hall': { links: ['academic-hammond-hall'], load: () => import('./indoor/academic-trimble-hall') },
  'academic-university-center': { links: [], load: () => import('./indoor/academic-university-center') },
  'academic-university-hall': { links: [], load: () => import('./indoor/academic-university-hall') },
  'academic-wetsel-building': { links: [], load: () => import('./indoor/academic-wetsel-building') },
  'academic-woolf-hall': { links: [], load: () => import('./indoor/academic-woolf-hall') },
  'administration-dan-dipert-welcome-center': { links: [], load: () => import('./indoor/administration-dan-dipert-welcome-center') },
  'administration-texas-hall': { links: [], load: () => import('./indoor/administration-texas-hall') },
  'administration-university-administration-building': { links: [], load: () => import('./indoor/administration-university-administration-building') },
  'administration-uta-police-department': { links: [], load: () => import('./indoor/administration-uta-police-department') },
  'apartment-the-heights-on-pecan': { links: [], load: () => import('./indoor/apartment-the-heights-on-pecan') },
  'apartment-the-lofts': { links: [], load: () => import('./indoor/apartment-the-lofts') },
  'misc-college-park-center': { links: [], load: () => import('./indoor/misc-college-park-center') },
  'residence-arlington-hall': { links: [], load: () => import('./indoor/residence-arlington-hall') },
  'residence-kalpana-chawla-hall': { links: [], load: () => import('./indoor/residence-kalpana-chawla-hall') },
  'residence-trinity-hall': { links: [], load: () => import('./indoor/residence-trinity-hall') },
  'residence-vandergriff-hall': { links: [], load: () => import('./indoor/residence-vandergriff-hall') },
  'residence-west-hall': { links: [], load: () => import('./indoor/residence-west-hall') },
};
