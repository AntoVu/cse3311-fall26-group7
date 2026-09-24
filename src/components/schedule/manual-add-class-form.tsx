import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BuildingPickerField } from '@/components/schedule/building-picker-field';
import { TimePickerField } from '@/components/settings/time-picker-field';
import { ThemedText } from '@/components/themed-text';
import { showAlert } from '@/components/ui/alert';
import { Spacing } from '@/constants/theme';
import { useSchedule, validateClassInput } from '@/context/schedule-context';
import { findBuilding } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';

const PROBLEM_MESSAGES = {
  missingFields: 'Please fill in all fields.',
  unknownBuilding: 'Pick a building from the list so the app can route you to it.',
  endsBeforeItStarts: 'The end time needs to be after the start time.',
} as const;

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
  const { addClass } = useSchedule();

  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  function handleSubmit() {
    const input = { courseName, courseCode, buildingId, roomNumber, startTime, endTime };
    const problem = validateClassInput(input, (id) => findBuilding(id) !== undefined);
    if (problem) {
      showAlert('Check the class details', PROBLEM_MESSAGES[problem]);
      return;
    }

    addClass(input);

    setCourseName('');
    setCourseCode('');
    setBuildingId('');
    setRoomNumber('');
    setStartTime('');
    setEndTime('');

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
