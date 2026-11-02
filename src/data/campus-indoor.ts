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
  'academic-business-building': { links: [], load: () => import('./indoor/academic-business-building') },
  'academic-carlisle-hall': { links: [], load: () => import('./indoor/academic-carlisle-hall') },
  'academic-chemistry-physics-building': { links: [], load: () => import('./indoor/academic-chemistry-physics-building') },
  'academic-earth-and-environmental-sciences': { links: [], load: () => import('./indoor/academic-earth-and-environmental-sciences') },
  'academic-engineering-research-building': { links: [], load: () => import('./indoor/academic-engineering-research-building') },
  'academic-environmental-health-and-safety': { links: [], load: () => import('./indoor/academic-environmental-health-and-safety') },
  'academic-general-academic-classroom-building': { links: [], load: () => import('./indoor/academic-general-academic-classroom-building') },
  'academic-library-collections-depository': { links: [], load: () => import('./indoor/academic-library-collections-depository') },
  'academic-life-science-building': { links: [], load: () => import('./indoor/academic-life-science-building') },
  'academic-maverick-activities-center': { links: [], load: () => import('./indoor/academic-maverick-activities-center') },
  'academic-nanotech-building': { links: [], load: () => import('./indoor/academic-nanotech-building') },
  'academic-nedderman-hall': { links: [], load: () => import('./indoor/academic-nedderman-hall') },
  'academic-pickard-hall': { links: [], load: () => import('./indoor/academic-pickard-hall') },
  'academic-preston-hall': { links: [], load: () => import('./indoor/academic-preston-hall') },
  'academic-thermal-energy-plant': { links: [], load: () => import('./indoor/academic-thermal-energy-plant') },
  'academic-trimble-hall': { links: [], load: () => import('./indoor/academic-trimble-hall') },
  'academic-university-center': { links: [], load: () => import('./indoor/academic-university-center') },
  'academic-university-hall': { links: [], load: () => import('./indoor/academic-university-hall') },
  'academic-woolf-hall': { links: [], load: () => import('./indoor/academic-woolf-hall') },
  'administration-dan-dipert-welcome-center': { links: [], load: () => import('./indoor/administration-dan-dipert-welcome-center') },
  'administration-uta-police-department': { links: [], load: () => import('./indoor/administration-uta-police-department') },
  'apartment-the-lofts': { links: [], load: () => import('./indoor/apartment-the-lofts') },
  'residence-arlington-hall': { links: [], load: () => import('./indoor/residence-arlington-hall') },
};
