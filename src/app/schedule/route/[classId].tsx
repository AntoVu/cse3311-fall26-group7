import { useLocalSearchParams } from 'expo-router';

import { RouteScreen } from '@/components/routing/route-screen';
import { displayTime } from '@/components/settings/time-format';
import { buildingLabel } from '@/data/buildings';
import { useClassRoute } from '@/hooks/use-class-route';
import { useTimeFormat } from '@/state/time-format';

/** The walk to a class, from the Schedule list. The screen itself is shared (RouteScreen). */
export default function ClassRouteScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { scheduleClass } = useClassRoute(classId);
  const timeFormat = useTimeFormat();

  return (
    <RouteScreen
      target={scheduleClass ? { buildingId: scheduleClass.buildingId, room: scheduleClass.roomNumber } : null}
      title={
        scheduleClass
          ? `${scheduleClass.courseCode} · ${buildingLabel(scheduleClass.buildingId)} ${scheduleClass.roomNumber} · ${displayTime(scheduleClass.startTime, timeFormat)}`
          : 'Class not found'
      }
      indoorHref={{ pathname: '/schedule/indoor/[classId]', params: { classId } }}
      backHref="/schedule"
    />
  );
}
