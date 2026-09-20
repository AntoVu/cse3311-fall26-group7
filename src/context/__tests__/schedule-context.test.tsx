import {
  addClassToSchedule,
  classifyScheduleClass,
  createScheduleClass,
  getMinutesSinceMidnight,
  parseTimeString,
  removeClassFromSchedule,
} from '@/context/schedule-context';
import { MOCK_SCHEDULE, type ScheduleClass } from '@/mocks/schedule';

function createTime(hours: number, minutes: number): Date {
  const d = new Date(2026, 8, 20, hours, minutes, 0);
  return d;
}

describe('parseTimeString', () => {
  it('parses standard morning AM times', () => {
    expect(parseTimeString('9:00 AM')).toBe(540);
    expect(parseTimeString('10:20 AM')).toBe(620);
  });

  it('parses standard afternoon PM times', () => {
    expect(parseTimeString('2:00 PM')).toBe(840);
    expect(parseTimeString('3:20 PM')).toBe(920);
    expect(parseTimeString('4:00 PM')).toBe(960);
    expect(parseTimeString('5:20 PM')).toBe(1040);
  });

  it('handles 12:00 PM (noon) and 12:00 AM (midnight)', () => {
    expect(parseTimeString('12:00 PM')).toBe(720);
    expect(parseTimeString('12:30 PM')).toBe(750);
    expect(parseTimeString('12:00 AM')).toBe(0);
    expect(parseTimeString('12:45 AM')).toBe(45);
  });

  it('returns NaN for invalid time strings', () => {
    expect(parseTimeString('')).toBeNaN();
    expect(parseTimeString('invalid')).toBeNaN();
    expect(parseTimeString('13:00 PM')).toBeNaN();
    expect(parseTimeString('9:65 AM')).toBeNaN();
    expect(parseTimeString('0:00 AM')).toBeNaN();
  });
});

describe('getMinutesSinceMidnight', () => {
  it('computes correct minutes since midnight from Date', () => {
    expect(getMinutesSinceMidnight(createTime(9, 30))).toBe(570);
    expect(getMinutesSinceMidnight(createTime(14, 15))).toBe(855);
    expect(getMinutesSinceMidnight(createTime(0, 0))).toBe(0);
  });
});

describe('classifyScheduleClass', () => {
  // Test dataset with three classes:
  // 1: 9:00 AM - 10:20 AM
  // 2: 2:00 PM - 3:20 PM
  // 3: 4:00 PM - 5:20 PM
  const testClasses: ScheduleClass[] = [...MOCK_SCHEDULE];

  it('marks first class upcoming and remaining normal before any class starts (7:30 AM)', () => {
    const now = createTime(7, 30); // 450 minutes
    const result = classifyScheduleClass(testClasses, now);

    // Class 1 (9:00 AM = 540 min)
    expect(result[0].status).toBe('upcoming');
    expect(result[0].completed).toBe(false);
    expect(result[0].startsInMinutes).toBe(90); // 540 - 450

    // Class 2 (2:00 PM)
    expect(result[1].status).toBe('normal');
    expect(result[1].completed).toBe(false);
    expect(result[1].startsInMinutes).toBeUndefined();

    // Class 3 (4:00 PM)
    expect(result[2].status).toBe('normal');
    expect(result[2].completed).toBe(false);
    expect(result[2].startsInMinutes).toBeUndefined();
  });

  it('marks first class upcoming with startsInMinutes = 0 while in progress (9:30 AM)', () => {
    const now = createTime(9, 30);
    const result = classifyScheduleClass(testClasses, now);

    expect(result[0].status).toBe('upcoming');
    expect(result[0].completed).toBe(false);
    expect(result[0].startsInMinutes).toBe(0); // In progress

    expect(result[1].status).toBe('normal');
    expect(result[2].status).toBe('normal');
  });

  it('marks first class done and second class upcoming between classes (11:00 AM)', () => {
    const now = createTime(11, 0); // 660 minutes
    const result = classifyScheduleClass(testClasses, now);

    // Class 1 ended at 10:20 AM (620 min) -> done
    expect(result[0].status).toBe('done');
    expect(result[0].completed).toBe(true);
    expect(result[0].startsInMinutes).toBeUndefined();

    // Class 2 starts at 2:00 PM (840 min) -> upcoming, starts in 180 min
    expect(result[1].status).toBe('upcoming');
    expect(result[1].completed).toBe(false);
    expect(result[1].startsInMinutes).toBe(180); // 840 - 660

    // Class 3 starts at 4:00 PM -> normal
    expect(result[2].status).toBe('normal');
    expect(result[2].completed).toBe(false);
  });

  it('marks second class upcoming (in progress) and third normal at 2:30 PM', () => {
    const now = createTime(14, 30);
    const result = classifyScheduleClass(testClasses, now);

    expect(result[0].status).toBe('done');
    expect(result[1].status).toBe('upcoming');
    expect(result[1].startsInMinutes).toBe(0);
    expect(result[2].status).toBe('normal');
  });

  it('marks third class upcoming after second class ends (3:30 PM)', () => {
    const now = createTime(15, 30); // 930 minutes
    const result = classifyScheduleClass(testClasses, now);

    expect(result[0].status).toBe('done');
    expect(result[1].status).toBe('done');
    expect(result[2].status).toBe('upcoming');
    expect(result[2].startsInMinutes).toBe(30); // 960 - 930
  });

  it('marks all classes done in the evening after all classes finish (6:00 PM)', () => {
    const now = createTime(18, 0);
    const result = classifyScheduleClass(testClasses, now);

    expect(result[0].status).toBe('done');
    expect(result[0].completed).toBe(true);
    expect(result[1].status).toBe('done');
    expect(result[1].completed).toBe(true);
    expect(result[2].status).toBe('done');
    expect(result[2].completed).toBe(true);

    // No upcoming class exists
    expect(result.find((c) => c.status === 'upcoming')).toBeUndefined();
  });

  it('promotes the next class to upcoming when the currently upcoming class is removed', () => {
    const now = createTime(11, 0); // Class 1 is done, Class 2 was upcoming
    const classesWithSecondRemoved = removeClassFromSchedule(testClasses, testClasses[1].id);
    const result = classifyScheduleClass(classesWithSecondRemoved, now);

    expect(result.length).toBe(2);
    expect(result[0].id).toBe(testClasses[0].id);
    expect(result[0].status).toBe('done');

    // Class 3 is now the upcoming class!
    expect(result[1].id).toBe(testClasses[2].id);
    expect(result[1].status).toBe('upcoming');
    expect(result[1].startsInMinutes).toBe(300); // 960 - 660
  });
});

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

describe('createScheduleClass', () => {
  it('creates ScheduleClass from Ayesha-style manual form input', () => {
    const created = createScheduleClass({
      className: 'Operating Systems',
      classCode: 'CSE 3320',
      building: 'ERB',
      room: '129',
      startTime: '10:00 AM',
      endTime: '10:50 AM',
    });

    expect(created.courseName).toBe('Operating Systems');
    expect(created.courseCode).toBe('CSE 3320');
    expect(created.buildingCode).toBe('ERB');
    expect(created.roomNumber).toBe('129');
    expect(created.startTime).toBe('10:00 AM');
    expect(created.endTime).toBe('10:50 AM');
    expect(created.completed).toBe(false);
    expect(created.id).toBeDefined();

    // Cross-form aliases
    expect(created.className).toBe('Operating Systems');
    expect(created.classCode).toBe('CSE 3320');
    expect(created.building).toBe('ERB');
    expect(created.room).toBe('129');
  });

  it('trims leading and trailing whitespace from input fields', () => {
    const created = createScheduleClass({
      className: '  Senior Design  ',
      classCode: '  CSE 4316  ',
      building: '  NH  ',
      room: '  100  ',
      startTime: '  1:00 PM  ',
      endTime: '  2:20 PM  ',
    });

    expect(created.courseName).toBe('Senior Design');
    expect(created.courseCode).toBe('CSE 4316');
    expect(created.buildingCode).toBe('NH');
    expect(created.roomNumber).toBe('100');
    expect(created.startTime).toBe('1:00 PM');
    expect(created.endTime).toBe('2:20 PM');
  });

  it('uses provided id if supplied', () => {
    const created = createScheduleClass({
      id: 'custom-class-id',
      className: 'Algorithms',
      classCode: 'CSE 2320',
      building: 'PKH',
      room: '202',
      startTime: '8:00 AM',
      endTime: '9:20 AM',
    });

    expect(created.id).toBe('custom-class-id');
  });
});

describe('addClassToSchedule', () => {
  it('adds a new class to an existing list without mutating the original', () => {
    const original = [...MOCK_SCHEDULE];
    const newClassInput = {
      className: 'Software Testing',
      classCode: 'CSE 3311',
      building: 'ERB',
      room: '103',
      startTime: '11:00 AM',
      endTime: '12:20 PM',
    };

    const updated = addClassToSchedule(original, newClassInput);

    expect(original.length).toBe(MOCK_SCHEDULE.length);
    expect(updated.length).toBe(MOCK_SCHEDULE.length + 1);
    expect(updated).not.toBe(original);

    const added = updated[updated.length - 1];
    expect(added.courseCode).toBe('CSE 3311');
    expect(added.courseName).toBe('Software Testing');
    expect(added.buildingCode).toBe('ERB');
    expect(added.roomNumber).toBe('103');
    expect(added.startTime).toBe('11:00 AM');
    expect(added.endTime).toBe('12:20 PM');
  });

  it('correctly integrates with classifyScheduleClass', () => {
    // Current time at 10:30 AM
    const now = createTime(10, 30);
    const updated = addClassToSchedule(MOCK_SCHEDULE, {
      className: 'Computer Graphics',
      classCode: 'CSE 4350',
      building: 'NH',
      room: '102',
      startTime: '11:00 AM',
      endTime: '12:20 PM',
    });

    const classified = classifyScheduleClass(updated, now);
    const addedClass = classified.find((c) => c.courseCode === 'CSE 4350');

    expect(addedClass).toBeDefined();
    // In MOCK_SCHEDULE:
    // cse-3330 ended at 10:20 AM (done)
    // newly added class starts at 11:00 AM (upcoming, starts in 30 mins!)
    // cse-3310 starts at 2:00 PM (normal)
    expect(addedClass?.status).toBe('upcoming');
    expect(addedClass?.startsInMinutes).toBe(30);
  });
});
