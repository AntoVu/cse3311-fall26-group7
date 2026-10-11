import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BuildingPickerField } from '@/components/schedule/building-picker-field';
import { DayPicker } from '@/components/schedule/day-picker';
import { TimePickerField } from '@/components/settings/time-picker-field';
import { ThemedText } from '@/components/themed-text';
import { confirmAction, showAlert } from '@/components/ui/alert';
import { Spacing } from '@/constants/theme';
import {
  findOverlap,
  useSchedule,
  validateClassInput,
  WEEKDAY_NAMES,
  type AddClassInput,
} from '@/context/schedule-context';
import { findBuilding } from '@/data/buildings';
import { INDOOR_FLOOR_PLANS } from '@/data/campus-indoor';
import { useTheme } from '@/hooks/use-theme';
import { campusGraph } from '@/routing/campus-graph';
import { unmappedFloorOf } from '@/routing/floors';
import { findRoomNode, hasIndoorMap } from '@/routing/rooms';

const PROBLEM_MESSAGES = {
  missingFields: 'Please fill in all fields.',
  noDays: 'Pick the days the class meets.',
  unknownBuilding: 'Pick a building from the list so the app can route you to it.',
  endsBeforeItStarts: 'The end time needs to be after the start time.',
} as const;

/**
 * Asks before adding a class that looks wrong but might not be: one that overlaps another on the
 * same day, or a room the building's indoor map doesn't have (a typo, or a room not traced yet).
 */
async function confirmUnusual(input: AddClassInput, existing: Parameters<typeof findOverlap>[0]) {
  const overlap = findOverlap(existing, input);
  if (
    overlap &&
    !(await confirmAction(
      'Classes overlap',
      `This overlaps ${overlap.scheduleClass.courseCode} on ${WEEKDAY_NAMES[overlap.day]}. Add it anyway?`,
      'Add'
    ))
  ) {
    return false;
  }

  const building = findBuilding(input.buildingId);
  const room = input.roomNumber.trim();
  const unknownRoom =
    building &&
    hasIndoorMap(campusGraph, building.id) &&
    !findRoomNode(campusGraph, building.id, room) &&
    !unmappedFloorOf(INDOOR_FLOOR_PLANS[building.id], room);
  return (
    !unknownRoom ||
    confirmAction(
      'Room not found',
      `Room ${room} isn't on the ${building.name} map. The route will lead to the building instead. Add it anyway?`,
      'Add'
    )
  );
}
export type ManualAddClassFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
};

export function ManualAddClassForm({
  onSuccess,
  onCancel,
  showCancelButton = false,
}: ManualAddClassFormProps) {
  const theme = useTheme();
  const { addClass, classes } = useSchedule();

  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [days, setDays] = useState<number[]>([]);

  async function handleSubmit() {
    const input = { courseName, courseCode, buildingId, roomNumber, startTime, endTime, days };
    const problem = validateClassInput(input, (id) => findBuilding(id) !== undefined);
    if (problem) {
      showAlert('Check the class details', PROBLEM_MESSAGES[problem]);
      return;
    }
    if (!(await confirmUnusual(input, classes))) return;

    addClass(input);

    setCourseName('');
    setCourseCode('');
    setBuildingId('');
    setRoomNumber('');
    setStartTime('');
    setEndTime('');
    setDays([]);

    onSuccess?.();
  }

  return (
    <View style={styles.formContainer}>
      <ThemedText type="smallBold">Class Name</ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        placeholder="Operating Systems"
        placeholderTextColor={theme.textSecondary}
        value={courseName}
        onChangeText={setCourseName}
        accessibilityLabel="Class Name"
      />

      <ThemedText type="smallBold">Class Code</ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        placeholder="CSE 3320"
        placeholderTextColor={theme.textSecondary}
        value={courseCode}
        onChangeText={setCourseCode}
        autoCapitalize="characters"
        accessibilityLabel="Class Code"
      />

      <ThemedText type="smallBold">Building</ThemedText>
      <BuildingPickerField value={buildingId} onChange={setBuildingId} />

      <ThemedText type="smallBold">Room Number</ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        placeholder="129"
        placeholderTextColor={theme.textSecondary}
        value={roomNumber}
        onChangeText={setRoomNumber}
        accessibilityLabel="Room Number"
      />

      <ThemedText type="smallBold">Days</ThemedText>
      <View style={styles.days}>
        <DayPicker
          label="Days"
          selected={days}
          onToggle={(day) =>
            setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]))
          }
        />
      </View>

      <ThemedText type="smallBold">Start Time</ThemedText>
      <TimePickerField
        label="Start Time"
        value={startTime}
        onChange={setStartTime}
        placeholder="10:00 AM"
      />

      <ThemedText type="smallBold">End Time</ThemedText>
      <TimePickerField
        label="End Time"
        value={endTime}
        onChange={setEndTime}
        placeholder="10:50 AM"
        defaultTime={startTime || undefined}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add Class"
        style={styles.addButton}
        onPress={handleSubmit}>
        <ThemedText style={styles.addButtonText}>Add Class</ThemedText>
      </Pressable>

      {showCancelButton && onCancel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={[styles.cancelButton, { backgroundColor: theme.backgroundElement }]}
          onPress={onCancel}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Cancel
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    width: '100%',
    gap: Spacing.half,
  },
  days: {
    marginBottom: Spacing.two,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
  addButton: {
    backgroundColor: '#3c87f7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});
