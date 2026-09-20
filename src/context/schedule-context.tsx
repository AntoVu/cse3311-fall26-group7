import { createContext, useContext, useState, type ReactNode } from 'react';

import { MOCK_SCHEDULE, type ScheduleClass } from '@/mocks/schedule';

export function removeClassFromSchedule(
  classes: ScheduleClass[],
  classId: string
): ScheduleClass[] {
  return classes.filter((item) => item.id !== classId);
}

export type ScheduleContextType = {
  classes: ScheduleClass[];
  removeClass: (classId: string) => void;
  resetSchedule: () => void;
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<ScheduleClass[]>(MOCK_SCHEDULE);

  const removeClass = (classId: string) => {
    setClasses((prev) => removeClassFromSchedule(prev, classId));
  };


  const resetSchedule = () => {
    setClasses(MOCK_SCHEDULE);
  };

  return (
    <ScheduleContext.Provider value={{ classes, removeClass, resetSchedule }}>
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
