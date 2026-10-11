import { useLocalSearchParams } from 'expo-router';

import { IndoorRouteScreen } from '@/components/routing/indoor-route-screen';

/** Inside the building, to a room picked on the Map tab. Same screen as a class's. */
export default function MapIndoorScreen() {
  const { building, room } = useLocalSearchParams<{ building?: string; room?: string }>();

  return (
    <IndoorRouteScreen target={building ? { buildingId: building, room: room || undefined } : null} backHref="/map" />
  );
}
