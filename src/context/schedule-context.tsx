import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { MOCK_SCHEDULE, type ClassStatus, type ScheduleClass } from '@/mocks/schedule';
import { useClockOffset } from '@/state/dev-clock';

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

/**
 * What the Add Class form collects.
 *
 * One spelling per field. It used to accept two (`classCode` or `courseCode`, `building` or
 * `buildingCode`) because the Schedule tab and Settings were written separately -- they now
 * render the same ManualAddClassForm, so the second spelling had no callers left.
 *
 * `buildingId` is a POI id rather than typed text: that is the link that lets the schedule
 * route to a class. See src/data/buildings.ts.
 */
export type AddClassInput = {
  courseCode: string;
  courseName: string;
  buildingId: string;
  roomNumber: string;
  startTime: string;
  endTime: string;
  id?: string;
};

/** Why an Add Class submission was rejected, or null when it is good. */
export type ClassInputProblem = 'missingFields' | 'unknownBuilding' | 'endsBeforeItStarts';

/**
 * Checks a submission before it becomes a class.
 *
 * Iteration 1 only checked that the fields were non-empty, so "ERBB 999" at "5 PM to 9 AM"
 * was accepted. Both gaps were written up as known issues in the Iteration 1 deliverable.
 */
export function validateClassInput(
  input: AddClassInput,
  buildingExists: (buildingId: string) => boolean
): ClassInputProblem | null {
  const filled = [
    input.courseCode,
    input.courseName,
    input.buildingId,
    input.roomNumber,
    input.startTime,
    input.endTime,
  ].every((value) => value?.trim());
  if (!filled) return 'missingFields';

  if (!buildingExists(input.buildingId.trim())) return 'unknownBuilding';

  const start = parseTimeString(input.startTime);
  const end = parseTimeString(input.endTime);
  // Unreadable times are not this check's business; the pickers only produce valid ones.
  if (!isNaN(start) && !isNaN(end) && end <= start) return 'endsBeforeItStarts';

  return null;
}

export function createScheduleClass(input: AddClassInput): ScheduleClass {
  const courseCode = input.courseCode.trim();

  return {
    id:
      input.id ??
      `${courseCode.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'class'}-${Date.now()}`,
    courseCode,
    courseName: input.courseName.trim(),
    buildingId: input.buildingId.trim(),
    roomNumber: input.roomNumber.trim(),
    startTime: input.startTime.trim(),
    endTime: input.endTime.trim(),
    completed: false,
  };
}

export function addClassToSchedule(
  classes: ScheduleClass[],
  input: AddClassInput
): ScheduleClass[] {
  return sortScheduleClasses([...classes, createScheduleClass(input)]);
}

export type ScheduleContextType = {
  /** Chronological, each class labeled with its status for the current time. */
  classes: (ScheduleClass & { status: ClassStatus })[];
  addClass: (newClass: AddClassInput) => void;
  removeClass: (classId: string) => void;
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
  const [realTime, setRealTime] = useState<Date>(() => initialTime ?? new Date());
  // Settings > Developer can move the app's clock; everything reads this shifted time.
  const clockOffset = useClockOffset();
  const currentTime = useMemo(
    () => new Date(realTime.getTime() + clockOffset * 60_000),
    [realTime, clockOffset]
  );

  useEffect(() => {
    if (initialTime || process.env.NODE_ENV === 'test') return; // Allow fixed time for tests or previews

    // Periodically update with phone system time every 30 seconds
    const interval = setInterval(() => {
      setRealTime(new Date());
    }, 30_000);

    return () => clearInterval(interval);
  }, [initialTime]);

  // The web build pre-renders at build time, whose clock is not the reader's. Until hydration,
  // every class is plain 'normal' rather than labeled for the wrong time of day.
  const hasHydrated = useHasHydrated();
  const classifiedClasses = useMemo(() => {
    if (!hasHydrated) {
      return sortScheduleClasses(classes).map((item) => ({ ...item, status: 'normal' as const }));
    }
    return classifyScheduleClass(classes, currentTime);
  }, [classes, currentTime, hasHydrated]);

  const addClass = (newClass: AddClassInput) => {
    setClasses((prev) => addClassToSchedule(prev, newClass));
  };

  const removeClass = (classId: string) => {
    setClasses((prev) => removeClassFromSchedule(prev, classId));
  };

  return (
    <ScheduleContext.Provider
      value={{
        classes: classifiedClasses,
        addClass,
        removeClass,
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
