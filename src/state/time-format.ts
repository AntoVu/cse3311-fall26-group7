import { createStore, useStore } from '@/state/create-store';

export type TimeFormat = '12-hour' | '24-hour';

export const timeFormatStore = createStore<TimeFormat>('12-hour');

export function useTimeFormat(): TimeFormat {
  return useStore(timeFormatStore);
}
