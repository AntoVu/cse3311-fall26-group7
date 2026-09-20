export type ClassStatus = 'done' | 'upcoming' | 'normal';

export type ScheduleClass = {
  id: string;
  courseCode: string;
  courseName: string;
  buildingCode: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  status?: ClassStatus;
  distanceMiles?: number;
  walkMinutes?: number;
  startsInMinutes?: number;
  className?: string;
  classCode?: string;
  building?: string;
  room?: string;
};

// Matches the Schedule wireframe's example content so screenshots/demos line up.
export const MOCK_SCHEDULE: ScheduleClass[] = [
  {
    id: 'cse-3330',
    courseCode: 'CSE 3330',
    courseName: 'Databases',
    buildingCode: 'NH',
    roomNumber: '228',
    startTime: '9:00 AM',
    endTime: '10:20 AM',
    completed: true,
    distanceMiles: 0.4,
    walkMinutes: 8,
    classCode: 'CSE 3330',
    className: 'Databases',
    building: 'NH',
    room: '228',
  },
  {
    id: 'cse-3310',
    courseCode: 'CSE 3310',
    courseName: 'Fundamentals of SWE',
    buildingCode: 'NH',
    roomNumber: '103',
    startTime: '2:00 PM',
    endTime: '3:20 PM',
    completed: false,
    distanceMiles: 0.4,
    walkMinutes: 8,
    startsInMinutes: 47,
    classCode: 'CSE 3310',
    className: 'Fundamentals of SWE',
    building: 'NH',
    room: '103',
  },
  {
    id: 'phys-1444',
    courseCode: 'PHYS 1444',
    courseName: 'Physics II',
    buildingCode: 'SH',
    roomNumber: '112',
    startTime: '4:00 PM',
    endTime: '5:20 PM',
    completed: false,
    distanceMiles: 0.6,
    walkMinutes: 12,
    classCode: 'PHYS 1444',
    className: 'Physics II',
    building: 'SH',
    room: '112',
  },
];

