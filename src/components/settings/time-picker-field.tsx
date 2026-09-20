import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  dateToTime,
  TIME_STEP_MINUTES,
  timeToDate,
} from '@/components/settings/time-format';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder: string;
  // Where the picker opens when nothing is selected yet, e.g. "8:00 AM".
  defaultTime?: string;
};

// A field that opens the phone's own time picker, snapped to 5-minute steps.
// Android: the system time dialog. iOS: the system wheel in a sheet (iOS only offers
// minute steps on the wheel style). Web uses time-picker-field.web.tsx (plain text).
export function TimePickerField({
  label,
  value,
  onChange,
  placeholder,
  defaultTime = '8:00 AM',
}: TimePickerFieldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(() => timeToDate(value, defaultTime));

  function openPicker() {
    Keyboard.dismiss();
    const start = timeToDate(value, defaultTime);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: 'time',
        display: 'spinner',
        is24Hour: false,
        minuteInterval: TIME_STEP_MINUTES,
        onValueChange: (_event, date) => onChange(dateToTime(date)),
      });
      return;
    }

    setDraft(start);
    setIosOpen(true);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'not set'}. Tap to choose a time.`}
        onPress={openPicker}
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText themeColor={value ? 'text' : 'textSecondary'} style={styles.fieldText}>
          {value || placeholder}
        </ThemedText>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="fade"
          visible={iosOpen}
          onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)}>
            {/* Inner Pressable swallows taps so touching the sheet doesn't close it. */}
            <Pressable onPress={() => {}} style={styles.sheetWrapper}>
              <ThemedView
                style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
                <View style={styles.sheetHeader}>
                  <Pressable onPress={() => setIosOpen(false)} hitSlop={8}>
                    <ThemedText themeColor="textSecondary">Cancel</ThemedText>
                  </Pressable>
                  <ThemedText type="smallBold">{label}</ThemedText>
                  <Pressable
                    onPress={() => {
                      onChange(dateToTime(draft));
                      setIosOpen(false);
                    }}
                    hitSlop={8}>
                    <ThemedText type="smallBold">Done</ThemedText>
                  </Pressable>
                </View>

                <DateTimePicker
                  value={draft}
                  mode="time"
                  display="spinner"
                  is24Hour={false}
                  minuteInterval={TIME_STEP_MINUTES}
                  onValueChange={(_event, date) => setDraft(date)}
                />
              </ThemedView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    marginBottom: Spacing.two,
  },
  fieldText: {
    fontSize: 16,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: Spacing.three,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
});
