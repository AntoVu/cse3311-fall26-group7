import { useSchedule } from '@/context/schedule-context';
import { usePlaceRoute } from '@/hooks/use-place-route';

/** The walk to a class (its building and room), shared by its outdoor and indoor screens. */
export function useClassRoute(classId: string | undefined) {
  const { classes } = useSchedule();
  const scheduleClass = classes.find((candidate) => candidate.id === classId);
  const route = usePlaceRoute(
    scheduleClass && { buildingId: scheduleClass.buildingId, room: scheduleClass.roomNumber }
  );
  return { scheduleClass, ...route };
}
