export type ClassStatus = 'done' | 'upcoming' | 'normal';

export type ScheduleClass = {
  id: string;
  courseCode: string;
  courseName: string;
  /** Which building on the map, as a POI id. See src/data/buildings.ts. */
  buildingId: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  status?: ClassStatus;
  distanceMiles?: number;
  walkMinutes?: number;
  startsInMinutes?: number;
};

// The Schedule wireframe's example content, so a fresh install has something to show.
// `completed`/`startsInMinutes` here are placeholders: classifyScheduleClass recomputes both
// from the current time.
export const MOCK_SCHEDULE: ScheduleClass[] = [
  {
    id: 'cse-3330',
    courseCode: 'CSE 3330',
    courseName: 'Databases',
    buildingId: 'academic-nedderman-hall',
    roomNumber: '228',
    startTime: '9:00 AM',
    endTime: '10:20 AM',
    completed: true,
    distanceMiles: 0.4,
    walkMinutes: 8,
  },
  {
    id: 'cse-3310',
    courseCode: 'CSE 3310',
    courseName: 'Fundamentals of SWE',
    buildingId: 'academic-nedderman-hall',
    roomNumber: '103',
    startTime: '2:00 PM',
    endTime: '3:20 PM',
    completed: false,
    distanceMiles: 0.4,
    walkMinutes: 8,
    startsInMinutes: 47,
  },
  {
    id: 'phys-1444',
    courseCode: 'PHYS 1444',
    courseName: 'Physics II',
    buildingId: 'academic-science-hall',
    roomNumber: '112',
    startTime: '4:00 PM',
    endTime: '5:20 PM',
    completed: false,
    distanceMiles: 0.6,
    walkMinutes: 12,
  },
];

