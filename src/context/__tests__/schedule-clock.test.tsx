import renderer, { act } from 'react-test-renderer';

import { ScheduleProvider, useSchedule, type ScheduleContextType } from '@/context/schedule-context';
import type { ScheduleClass } from '@/mocks/schedule';
import { setClockOffset } from '@/state/dev-clock';

const NOW = new Date(2026, 9, 9, 9, 0);
const CLASS: ScheduleClass = {
  id: 'c',
  courseCode: 'CSE 1310',
  courseName: 'Intro',
  buildingId: 'academic-nedderman-hall',
  roomNumber: '100',
  startTime: '10:00 AM',
  endTime: '11:00 AM',
  completed: false,
};

describe('ScheduleProvider with the Developer clock offset', () => {
  afterEach(() => act(() => setClockOffset(0)));

  it('shifts the app time, and class statuses follow it', () => {
    let schedule: ScheduleContextType | undefined;
    const Probe = () => {
      schedule = useSchedule();
      return null;
    };
    act(() => {
      renderer.create(
        <ScheduleProvider initialTime={NOW} initialClasses={[CLASS]}>
          <Probe />
        </ScheduleProvider>
      );
    });
    expect(schedule!.currentTime).toEqual(NOW);
    expect(schedule!.classes[0].status).toBe('upcoming');

    act(() => setClockOffset(3 * 60));
    expect(schedule!.currentTime).toEqual(new Date(2026, 9, 9, 12, 0));
    expect(schedule!.classes[0].status).toBe('done');
  });
});
