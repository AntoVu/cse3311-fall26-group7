import { Stack } from 'expo-router';

import { ScheduleProvider } from '@/context/schedule-context';

export default function ScheduleLayout() {
  return (
    <ScheduleProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ScheduleProvider>
  );
}

