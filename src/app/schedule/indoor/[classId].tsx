import { useLocalSearchParams } from 'expo-router';

import { IndoorRouteScreen } from '@/components/routing/indoor-route-screen';
import { useClassRoute } from '@/hooks/use-class-route';

/** Inside the building, to a class's room. The screen itself is shared (IndoorRouteScreen). */
export default function ClassIndoorScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { scheduleClass } = useClassRoute(classId);

  return (
    <IndoorRouteScreen
      target={scheduleClass ? { buildingId: scheduleClass.buildingId, room: scheduleClass.roomNumber } : null}
      backHref="/schedule"
    />
  );
}
