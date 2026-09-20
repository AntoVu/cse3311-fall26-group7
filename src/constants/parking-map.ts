// Placeholder color for every parking lot on the Parking tab's map. Red because
// with no permit selected the user can't park anywhere. The permit-aware
// coloring replaces this by passing a real `getLotColor` to CampusMapView
// (src/app/parking/index.tsx); this stays as the "no access / no permit" fallback.
export const PARKING_LOT_DEFAULT_COLOR = '#E5484D';
