import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { TimePickerField } from '@/components/settings/time-picker-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';
import { useTheme } from '@/hooks/use-theme';

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

  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  function handleSubmit() {
    if (
      !className.trim() ||
      !classCode.trim() ||
      !building.trim() ||
      !room.trim() ||
      !startTime.trim() ||
      !endTime.trim()
    ) {
      const message = 'Please fill in all fields.';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(message);
        }
      } else {
        Alert.alert('Missing Information', message);
      }
      return;
    }

    addClass({
      className: className.trim(),
      classCode: classCode.trim(),
      building: building.trim(),
      room: room.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
    });

    setClassName('');
    setClassCode('');
    setBuilding('');
    setRoom('');
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
        value={className}
        onChangeText={setClassName}
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
        value={classCode}
        onChangeText={setClassCode}
        autoCapitalize="characters"
        accessibilityLabel="Class Code"
      />

      <ThemedText type="smallBold">Building</ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        placeholder="ERB"
        placeholderTextColor={theme.textSecondary}
        value={building}
        onChangeText={setBuilding}
        autoCapitalize="characters"
        accessibilityLabel="Building"
      />

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
        value={room}
        onChangeText={setRoom}
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
