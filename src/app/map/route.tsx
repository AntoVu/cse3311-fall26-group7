import { useLocalSearchParams } from 'expo-router';

import { RouteScreen } from '@/components/routing/route-screen';
import { findBuilding } from '@/data/buildings';
import { amenityById } from '@/routing/amenities';

/**
 * The walk to a building or room picked on the Map tab, or to the nearest amenity (`?amenity=vending`).
 * Same screen as a class's (RouteScreen).
 */
export default function MapRouteScreen() {
  const { building, room, amenity } = useLocalSearchParams<{ building?: string; room?: string; amenity?: string }>();
  const place = building ? findBuilding(building) : undefined;
  const wanted = amenity ? amenityById(amenity) : undefined;

  return (
    <RouteScreen
      target={wanted ? { amenity: wanted.id } : place ? { buildingId: place.id, room: room || undefined } : null}
      title={wanted ? `Nearest ${wanted.label.toLowerCase()}` : place ? (room ? `${place.name} · Room ${room}` : place.name) : 'Place not found'}
      indoorHref={{ pathname: '/map/indoor', params: { building: building ?? '', room: room ?? '', amenity: amenity ?? '' } }}
      backHref="/map"
    />
  );
}
