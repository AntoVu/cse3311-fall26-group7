export type ClassStatus = 'done' | 'upcoming' | 'normal';

/** A class in the user's schedule; `buildingId` is a POI id, so it can be routed to (src/data/buildings.ts). */
export type ScheduleClass = {
  id: string;
  courseCode: string;
  courseName: string;
  /** Which building on the map, as a POI id. See src/data/buildings.ts. */
  buildingId: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  /** Weekdays it meets, 0 = Sunday (like Date.getDay()). Missing means every day. */
  days?: number[];
  completed: boolean;
  status?: ClassStatus;
  distanceMiles?: number;
  walkMinutes?: number;
  startsInMinutes?: number;
};
