import { removeClassFromSchedule } from '@/context/schedule-context';
import { MOCK_SCHEDULE, type ScheduleClass } from '@/mocks/schedule';

describe('removeClassFromSchedule', () => {
  it('removes a class by matching id', () => {
    const classToRemove = MOCK_SCHEDULE[0];
    const updated = removeClassFromSchedule(MOCK_SCHEDULE, classToRemove.id);

    expect(updated.length).toBe(MOCK_SCHEDULE.length - 1);
    expect(updated.find((c) => c.id === classToRemove.id)).toBeUndefined();
  });

  it('returns the same elements if id is not found', () => {
    const updated = removeClassFromSchedule(MOCK_SCHEDULE, 'non-existent-id');

    expect(updated.length).toBe(MOCK_SCHEDULE.length);
    expect(updated).toEqual(MOCK_SCHEDULE);
  });

  it('preserves array immutability without mutating the original array', () => {
    const originalCopy = [...MOCK_SCHEDULE];
    const updated = removeClassFromSchedule(MOCK_SCHEDULE, MOCK_SCHEDULE[1].id);

    expect(MOCK_SCHEDULE).toEqual(originalCopy);
    expect(updated).not.toBe(MOCK_SCHEDULE);
  });

  it('can remove all classes sequentially until empty', () => {
    let list: ScheduleClass[] = [...MOCK_SCHEDULE];
    for (const item of MOCK_SCHEDULE) {
      list = removeClassFromSchedule(list, item.id);
    }

    expect(list).toEqual([]);
    expect(list.length).toBe(0);
  });
});
