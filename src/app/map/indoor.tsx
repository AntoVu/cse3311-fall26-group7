import { useLocalSearchParams } from 'expo-router';

import { IndoorRouteScreen } from '@/components/routing/indoor-route-screen';
import { amenityById } from '@/routing/amenities';

/** Inside the building, to a room picked on the Map tab or the nearest amenity. Same screen as a class's. */
export default function MapIndoorScreen() {
  const { building, room, amenity } = useLocalSearchParams<{ building?: string; room?: string; amenity?: string }>();
  const wanted = amenity ? amenityById(amenity) : undefined;

  return (
    <IndoorRouteScreen
      target={wanted ? { amenity: wanted.id } : building ? { buildingId: building, room: room || undefined } : null}
      backHref="/map"
    />
  );
}
