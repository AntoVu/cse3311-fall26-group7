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
 * Marks each class in the schedule based on the given time:
 * - 'done': current time is at or after the class end time.
 * - 'upcoming': the user's next class (the earliest unfinished class by start time).
 * - 'normal': not the next class (any later unfinished classes).
 */
export function classifyScheduleClass(
  classes: ScheduleClass[],
  now: Date = new Date()
): (ScheduleClass & { status: ClassStatus })[] {
  const currentMinutes = getMinutesSinceMidnight(now);

  const parsedItems = classes.map((item) => ({
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

export type ScheduleContextType = {
  classes: (ScheduleClass & { status: ClassStatus })[];
  rawClasses: ScheduleClass[];
  removeClass: (classId: string) => void;
  resetSchedule: () => void;
  currentTime: Date;
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

type ScheduleProviderProps = {
  children: ReactNode;
  initialTime?: Date;
};

export function ScheduleProvider({ children, initialTime }: ScheduleProviderProps) {
  const [classes, setClasses] = useState<ScheduleClass[]>(MOCK_SCHEDULE);
  const [currentTime, setCurrentTime] = useState<Date>(() => initialTime ?? new Date());

  useEffect(() => {
    if (initialTime) return; // Allow fixed time for tests or previews

    // Periodically update with phone system time every 30 seconds
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30_000);

    return () => clearInterval(interval);
  }, [initialTime]);

  const classifiedClasses = useMemo(() => {
    return classifyScheduleClass(classes, currentTime);
  }, [classes, currentTime]);

  const removeClass = (classId: string) => {
    setClasses((prev) => removeClassFromSchedule(prev, classId));
  };

  const resetSchedule = () => {
    setClasses(MOCK_SCHEDULE);
  };

  return (
    <ScheduleContext.Provider
      value={{
        classes: classifiedClasses,
        rawClasses: classes,
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
