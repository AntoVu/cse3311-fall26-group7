import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { buildingRooms, testClassTimes } from '@/components/settings/developer-tools';
import { Chip, RoomPicker } from '@/components/settings/room-picker';
import { formatTime } from '@/components/settings/time-format';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';
import { INDOOR_NODES } from '@/data/campus-indoor';
import { useHasHydrated } from '@/hooks/use-has-hydrated';
import { setClockOffset, useClockOffset } from '@/state/dev-clock';
import { setStartPoint } from '@/state/start-point';

// Temporary test switches for desk testing: a simulated clock, a test class in Nedderman Hall,
// and a start point inside it. Session only. Remove this screen and its Settings row before the
// final demo.

const NEDDERMAN = 'academic-nedderman-hall';
const FLOORS = buildingRooms(INDOOR_NODES, NEDDERMAN);
const FIRST_ROOM = { level: FLOORS[0]?.level ?? '', room: FLOORS[0]?.rooms[0] ?? '' };
/** Classes added here have ids with this prefix, so they can all be removed at once. */
const TEST_ID_PREFIX = 'dev-';
const CLOCK_STEPS = [
  { label: '−1 h', minutes: -60 },
  { label: '−15 min', minutes: -15 },
  { label: '+15 min', minutes: 15 },
  { label: '+1 h', minutes: 60 },
];

export default function DeveloperScreen() {
  const router = useRouter();
  const { classes, addClass, removeClass, currentTime } = useSchedule();
  const offset = useClockOffset();
  const hasHydrated = useHasHydrated();
  const [classRoom, setClassRoom] = useState(FIRST_ROOM);
  const [startRoom, setStartRoom] = useState(FIRST_ROOM);
  const [startMessage, setStartMessage] = useState('');

  const testClasses = classes.filter((item) => item.id.startsWith(TEST_ID_PREFIX));

  const addTestClass = () => {
    const id = `${TEST_ID_PREFIX}${Date.now()}`;
    addClass({
      id,
      courseCode: 'TEST',
      courseName: 'Indoor route test',
      buildingId: NEDDERMAN,
      roomNumber: classRoom.room,
      ...testClassTimes(currentTime),
    });
    router.push({ pathname: '/schedule/route/[classId]', params: { classId: id } });
  };

  const startInRoom = () => {
    setStartPoint({ kind: 'room', poiId: NEDDERMAN, room: startRoom.room });
    setStartMessage(`Routes now start at Nedderman Hall ${startRoom.room}.`);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Developer' }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <ThemedText type="subtitle">Clock</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Moves the app&apos;s time: class status, the next class and parking rules follow it.
            </ThemedText>
            {/* The page is pre-rendered at build time, so the time waits for hydration. */}
            <ThemedText type="smallBold">
              App time:{' '}
              {hasHydrated
                ? `${currentTime.toLocaleDateString('en-US', { weekday: 'short' })} ${formatTime(
                    currentTime.getHours() * 60 + currentTime.getMinutes()
                  )}`
                : '…'}
              {offset !== 0 ? ` (${formatOffset(offset)})` : ''}
            </ThemedText>
            <View style={styles.row}>
              {CLOCK_STEPS.map((step) => (
                <Chip
                  key={step.label}
                  label={step.label}
                  onPress={() => setClockOffset(offset + step.minutes)}
                />
              ))}
              <Chip label="Reset" disabled={offset === 0} onPress={() => setClockOffset(0)} />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Test class in Nedderman Hall</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Starts 30 minutes from the app&apos;s time and ends 90 minutes from it, in this room.
            </ThemedText>
            <RoomPicker
              floors={FLOORS}
              level={classRoom.level}
              room={classRoom.room}
              onChange={(level, room) => setClassRoom({ level, room })}
            />
            <View style={styles.row}>
              <Chip label={`Add class in ${classRoom.room}`} onPress={addTestClass} />
              <Chip
                label={`Remove test classes (${testClasses.length})`}
                disabled={testClasses.length === 0}
                onPress={() => testClasses.forEach((item) => removeClass(item.id))}
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Start inside Nedderman Hall</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Makes this room the start point, for room-to-room routes. Picking a start point on a
              route screen replaces it.
            </ThemedText>
            <RoomPicker
              floors={FLOORS}
              level={startRoom.level}
              room={startRoom.room}
              onChange={(level, room) => setStartRoom({ level, room })}
            />
            <View style={styles.row}>
              <Chip label={`Start from ${startRoom.room}`} onPress={startInRoom} />
            </View>
            {startMessage ? <ThemedText type="small">{startMessage}</ThemedText> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** 195 -> "+3 h 15 min", -15 -> "−15 min". */
function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+';
  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;
  return `${sign}${[hours && `${hours} h`, rest && `${rest} min`].filter(Boolean).join(' ')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, gap: Spacing.four },
  section: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
