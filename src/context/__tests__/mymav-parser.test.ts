import { parseMyMavSchedule } from '@/context/mymav-parser';
import { CAMPUS_POIS } from '@/data/campus-pois';

// MyMav's "My Class Schedule" list view, copied with select-all: a course title line, then a
// row per meeting (tab-separated). The sample is made up; the layout is PeopleSoft's.
const LIST_VIEW = [
  'Fall 2026 | Undergraduate | The University of Texas at Arlington',
  'CSE 3311 - OBJECT-ORIENTED SOFTWARE ENGINEERING',
  'Status\tUnits\tGrading\tDeadlines',
  'Enrolled\t3.00\tGraded\t',
  'Class Nbr\tSection\tComponent\tDays & Times\tRoom\tInstructor\tStart/End Date',
  '12345\t001\tLecture\tTuTh 11:00AM - 12:20PM\tNH 00109\tChristoph Csallner\t08/24/2026 - 12/10/2026',
  'CSE 3320 - Operating Systems',
  'Class Nbr\tSection\tComponent\tDays & Times\tRoom\tInstructor\tStart/End Date',
  '23456\t002\tLecture\tMoWe 1:00PM - 2:20PM\tEngineering Research Building 129\tStaff\t08/24/2026 - 12/10/2026',
  '23457\t102\tLaboratory\tFr 9:00AM - 11:50AM\tERB 208\tStaff\t08/24/2026 - 12/10/2026',
  'HIST 1301 - History of the United States to 1865',
  '34567\t700\tLecture\tTBA\tONLINE\tStaff\t08/24/2026 - 12/10/2026',
  'MATH 2425 - Calculus II',
  '45678\t003\tLecture\tMoWeFr 8:00AM - 8:50AM\tZZZ 101\tStaff\t08/24/2026 - 12/10/2026',
].join('\n');

const NH = 'academic-nedderman-hall';
const ERB = 'academic-engineering-research-building';

describe('parseMyMavSchedule', () => {
  const { classes, skipped } = parseMyMavSchedule(LIST_VIEW, CAMPUS_POIS);

  it('reads each meeting with a room as a class', () => {
    expect(classes).toEqual([
      {
        courseCode: 'CSE 3311',
        courseName: 'Object-Oriented Software Engineering',
        buildingId: NH,
        roomNumber: '109',
        days: [2, 4],
        startTime: '11:00 AM',
        endTime: '12:20 PM',
      },
      {
        courseCode: 'CSE 3320',
        courseName: 'Operating Systems',
        buildingId: ERB,
        roomNumber: '129',
        days: [1, 3],
        startTime: '1:00 PM',
        endTime: '2:20 PM',
      },
      {
        courseCode: 'CSE 3320',
        courseName: 'Operating Systems (Lab)',
        buildingId: ERB,
        roomNumber: '208',
        days: [5],
        startTime: '9:00 AM',
        endTime: '11:50 AM',
      },
    ]);
  });

  it('lists what it could not place, and why', () => {
    expect(skipped).toEqual([
      { courseCode: 'HIST 1301', reason: 'No set meeting time or room (online or TBA).' },
      { courseCode: 'MATH 2425', reason: 'Building "ZZZ" is not on the map. Add this class by hand.' },
    ]);
  });

  it('reads one field per line too (the phone layout), with MWF/TR days', () => {
    const phone = ['CSE 1310 - Introduction to Computers & Programming', 'Lecture', 'MWF 10:00AM to 10:50AM', 'Nedderman Hall 100', 'Class Nbr 11111'].join('\n');
    expect(parseMyMavSchedule(phone, CAMPUS_POIS).classes).toEqual([
      {
        courseCode: 'CSE 1310',
        courseName: 'Introduction to Computers & Programming',
        buildingId: NH,
        roomNumber: '100',
        days: [1, 3, 5],
        startTime: '10:00 AM',
        endTime: '10:50 AM',
      },
    ]);
    expect(parseMyMavSchedule('PHYS 1443 - General Technical Physics I\nTR 2:00PM - 3:20PM\tSH 100', CAMPUS_POIS).classes[0].days).toEqual([2, 4]);
  });

  it('keeps a meeting listed twice only once', () => {
    const row = '12345\t001\tLecture\tTuTh 11:00AM - 12:20PM\tNH 00109\tChristoph Csallner\t08/24/2026 - 12/10/2026';
    const twice = LIST_VIEW.replace(row, `${row}\n${row}`);
    expect(parseMyMavSchedule(twice, CAMPUS_POIS).classes).toHaveLength(3);
  });

  // The newer MyMav week view, copied as is (2026-11-01): a date, the start time, "CSE 3330 Lecture",
  // the room and status. No end time and no title.
  const WEEK_VIEW = [
    'Tuesday November 3', '11:00AM', 'CSE 3330 Lecture\t', 'Room: NH  111', 'Status: Enrolled', ' ',
    '12:30PM', 'CSE 3311 Lecture\t', 'Room: ERB 129', 'Status: Enrolled', ' ',
    'Thursday November 5', '11:00AM', 'CSE 3330 Lecture\t', 'Room: NH  111', 'Status: Enrolled', ' ',
    '12:30PM', 'CSE 3311 Lecture\t', 'Room: ERB 129', 'Status: Enrolled',
  ].join('\r\n');

  it('reads the week view, one class per course across the days it meets', () => {
    expect(parseMyMavSchedule(WEEK_VIEW, CAMPUS_POIS)).toEqual({
      classes: [
        // No end time is listed: a Tuesday/Thursday class is taken to run 80 minutes.
        { courseCode: 'CSE 3330', courseName: 'Lecture', buildingId: NH, roomNumber: '111', days: [2, 4], startTime: '11:00 AM', endTime: '12:20 PM' },
        { courseCode: 'CSE 3311', courseName: 'Lecture', buildingId: ERB, roomNumber: '129', days: [2, 4], startTime: '12:30 PM', endTime: '1:50 PM' },
      ],
      skipped: [],
    });
  });

  it('gives other weeks 50 minutes and skips a class that is not enrolled', () => {
    const text = [
      'Monday November 2', '9:00AM', 'MATH 2425 Lecture', 'Room: NH 100', 'Status: Enrolled',
      '1:00PM', 'CSE 3320 Laboratory', 'Room: ERB 208', 'Status: Dropped',
      'Wednesday November 4', '9:00AM', 'MATH 2425 Lecture', 'Room: NH 100', 'Status: Enrolled',
      '10:00AM', 'HIST 1301 Lecture', 'Room: ONLINE', 'Status: Enrolled',
    ].join('\n');
    expect(parseMyMavSchedule(text, CAMPUS_POIS)).toEqual({
      classes: [
        { courseCode: 'MATH 2425', courseName: 'Lecture', buildingId: NH, roomNumber: '100', days: [1, 3], startTime: '9:00 AM', endTime: '9:50 AM' },
      ],
      skipped: [
        { courseCode: 'CSE 3320', reason: 'Status is Dropped, not enrolled.' },
        { courseCode: 'HIST 1301', reason: 'No set meeting time or room (online or TBA).' },
      ],
    });
  });

  it('finds nothing in text that is not a schedule', () => {
    expect(parseMyMavSchedule('hello\nworld', CAMPUS_POIS)).toEqual({ classes: [], skipped: [] });
  });
});
