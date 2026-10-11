import { useLocalSearchParams } from 'expo-router';

import { RouteScreen } from '@/components/routing/route-screen';
import { findBuilding } from '@/data/buildings';

/** The walk to a building or room picked on the Map tab. Same screen as a class's (RouteScreen). */
export default function MapRouteScreen() {
  const { building, room } = useLocalSearchParams<{ building?: string; room?: string }>();
  const place = building ? findBuilding(building) : undefined;

  return (
    <RouteScreen
      target={place ? { buildingId: place.id, room: room || undefined } : null}
      title={place ? (room ? `${place.name} · Room ${room}` : place.name) : 'Place not found'}
      indoorHref={{ pathname: '/map/indoor', params: { building: building ?? '', room: room ?? '' } }}
      backHref="/map"
    />
  );
}
