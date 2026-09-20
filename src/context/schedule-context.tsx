import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { MOCK_SCHEDULE, type ClassStatus, type ScheduleClass } from '@/mocks/schedule';

/**
 * Parses a 12-hour formatted time string (e.g., "9:00 AM", "02:30 PM") into
 * total minutes since midnight (0 to 1439). Returns NaN if the format is invalid.
 */
export function parseTimeString(timeStr: string): number {
  if (!timeStr) return NaN;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return NaN;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return NaN;
  }

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Returns total minutes since midnight for a given Date object.
 */
export function getMinutesSinceMidnight(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Sorts an array of schedule classes chronologically by start time.
 * In the event of identical start times, classes are sorted by end time.
 */
export function sortScheduleClasses<T extends { startTime: string; endTime?: string }>(
  classes: T[]
): T[] {
  return [...classes].sort((a, b) => {
    const aStart = parseTimeString(a.startTime);
    const bStart = parseTimeString(b.startTime);

    const aStartValid = !isNaN(aStart);
    const bStartValid = !isNaN(bStart);

    if (aStartValid && bStartValid) {
      if (aStart !== bStart) {
        return aStart - bStart;
      }
      const aEnd = a.endTime ? parseTimeString(a.endTime) : NaN;
      const bEnd = b.endTime ? parseTimeString(b.endTime) : NaN;
      const aEndValid = !isNaN(aEnd);
      const bEndValid = !isNaN(bEnd);
      if (aEndValid && bEndValid && aEnd !== bEnd) {
        return aEnd - bEnd;
      }
      return 0;
    }

    if (aStartValid && !bStartValid) return -1;
    if (!aStartValid && bStartValid) return 1;
    return 0;
  });
}

/**
 * Marks each class in the schedule based on the given time:
 * - 'done': current time is at or after the class end time.
 * - 'upcoming': the user's next class (the earliest unfinished class by start time).
 * - 'normal': not the next class (any later unfinished classes).
 */
export function classifyScheduleClass(
  classes: ScheduleClass[],
  now: Date = new Date()
): (ScheduleClass & { status: ClassStatus })[] {
  const sortedClasses = sortScheduleClasses(classes);
  const currentMinutes = getMinutesSinceMidnight(now);

  const parsedItems = sortedClasses.map((item) => ({
    item,
    startMinutes: parseTimeString(item.startTime),
    endMinutes: parseTimeString(item.endTime),
  }));

  // Identify unfinished classes (classes whose end time has not yet passed)
  const unfinished = parsedItems
    .filter((p) => !isNaN(p.endMinutes) && currentMinutes < p.endMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  // The first unfinished class is the user's next class ("upcoming")
  const nextClassId = unfinished.length > 0 ? unfinished[0].item.id : null;

  return parsedItems.map(({ item, startMinutes, endMinutes }) => {
    let status: ClassStatus;
    let startsInMinutes: number | undefined = undefined;

    if (!isNaN(endMinutes) && currentMinutes >= endMinutes) {
      status = 'done';
    } else if (item.id === nextClassId) {
      status = 'upcoming';
      if (!isNaN(startMinutes)) {
        startsInMinutes = Math.max(0, startMinutes - currentMinutes);
      }
    } else {
      status = 'normal';
    }

    return {
      ...item,
      status,
      completed: status === 'done',
      startsInMinutes: status === 'upcoming' ? startsInMinutes : undefined,
    };
  });
}

export function removeClassFromSchedule(
  classes: ScheduleClass[],
  classId: string
): ScheduleClass[] {
  return classes.filter((item) => item.id !== classId);
}

export type AddClassInput = {
  className?: string;
  courseName?: string;
  classCode?: string;
  courseCode?: string;
  building?: string;
  buildingCode?: string;
  room?: string;
  roomNumber?: string;
  startTime: string;
  endTime: string;
  id?: string;
};

export function createScheduleClass(input: AddClassInput): ScheduleClass {
  const courseCode = (input.courseCode || input.classCode || '').trim();
  const courseName = (input.courseName || input.className || '').trim();
  const buildingCode = (input.buildingCode || input.building || '').trim();
  const roomNumber = (input.roomNumber || input.room || '').trim();
  const startTime = input.startTime.trim();
  const endTime = input.endTime.trim();
  const id =
    input.id ??
    `${courseCode.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'class'}-${Date.now()}`;

  return {
    id,
    courseCode,
    courseName,
    buildingCode,
    roomNumber,
    startTime,
    endTime,
    completed: false,
    classCode: courseCode,
    className: courseName,
    building: buildingCode,
    room: roomNumber,
  };
}

export function addClassToSchedule(
  classes: ScheduleClass[],
  input: AddClassInput | ScheduleClass
): ScheduleClass[] {
  const isExistingScheduleClass =
    'courseCode' in input &&
    'courseName' in input &&
    'id' in input &&
    typeof input.id === 'string' &&
    input.id.length > 0;

  const newClass: ScheduleClass = isExistingScheduleClass
    ? {
        ...(input as ScheduleClass),
        completed: (input as ScheduleClass).completed ?? false,
        classCode: (input as ScheduleClass).classCode ?? (input as ScheduleClass).courseCode,
        className: (input as ScheduleClass).className ?? (input as ScheduleClass).courseName,
        building: (input as ScheduleClass).building ?? (input as ScheduleClass).buildingCode,
        room: (input as ScheduleClass).room ?? (input as ScheduleClass).roomNumber,
      }
    : createScheduleClass(input as AddClassInput);

  return sortScheduleClasses([...classes, newClass]);
}

export type ScheduleContextType = {
  classes: (ScheduleClass & { status: ClassStatus })[];
  rawClasses: ScheduleClass[];
  addClass: (newClass: AddClassInput | ScheduleClass) => void;
  removeClass: (classId: string) => void;
  resetSchedule: () => void;
  currentTime: Date;
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

type ScheduleProviderProps = {
  children: ReactNode;
  initialTime?: Date;
  initialClasses?: ScheduleClass[];
};

export function ScheduleProvider({ children, initialTime, initialClasses }: ScheduleProviderProps) {
  const [classes, setClasses] = useState<ScheduleClass[]>(() =>
    sortScheduleClasses(initialClasses ?? MOCK_SCHEDULE)
  );
  const [currentTime, setCurrentTime] = useState<Date>(() => initialTime ?? new Date());

  useEffect(() => {
    if (initialTime || process.env.NODE_ENV === 'test') return; // Allow fixed time for tests or previews

    // Periodically update with phone system time every 30 seconds
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30_000);

    return () => clearInterval(interval);
  }, [initialTime]);

  const classifiedClasses = useMemo(() => {
    return classifyScheduleClass(classes, currentTime);
  }, [classes, currentTime]);

  const addClass = (newClass: AddClassInput | ScheduleClass) => {
    setClasses((prev) => addClassToSchedule(prev, newClass));
  };

  const removeClass = (classId: string) => {
    setClasses((prev) => removeClassFromSchedule(prev, classId));
  };

  const resetSchedule = () => {
    setClasses(sortScheduleClasses(initialClasses ?? MOCK_SCHEDULE));
  };

  return (
    <ScheduleContext.Provider
      value={{
        classes: classifiedClasses,
        rawClasses: classes,
        addClass,
        removeClass,
        resetSchedule,
        currentTime,
      }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule(): ScheduleContextType {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
