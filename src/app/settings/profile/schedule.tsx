import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { TimePickerField } from '@/components/settings/time-picker-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ClassEntry = {
  id: string;
  className: string;
  classCode: string;
  building: string;
  room: string;
  startTime: string;
  endTime: string;
};

export default function ProfileScheduleScreen() {
  const theme = useTheme();

  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [classes, setClasses] = useState<ClassEntry[]>([]);

  // Android doesn't inset the ScrollView for the keyboard, so pad the bottom by its
  // height to let the lower fields and the Add Class button scroll above it. iOS does
  // this itself via automaticallyAdjustKeyboardInsets below.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function addClass() {
    if (
      !className.trim() ||
      !classCode.trim() ||
      !building.trim() ||
      !room.trim() ||
      !startTime.trim() ||
      !endTime.trim()
    ) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }

    const newClass: ClassEntry = {
      id: Date.now().toString(),
      className: className.trim(),
      classCode: classCode.trim(),
      building: building.trim(),
      room: room.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
    };

    setClasses([...classes, newClass]);

    setClassName('');
    setClassCode('');
    setBuilding('');
    setRoom('');
    setStartTime('');
    setEndTime('');
  }

  function removeClass(id: string) {
    setClasses(classes.filter((cls) => cls.id !== id));
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Schedule',
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Spacing.five + keyboardHeight },
          ]}
        >
          <SettingsMenuItem
            label="Import MyMav Schedule"
            disabled
            onPress={() => {}}
          />

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.note}
          >
            Schedule import is coming in a later iteration.
          </ThemedText>

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Manual Input
          </ThemedText>

          <ThemedText type="smallBold">Class Name</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
              },
            ]}
            placeholder="Ex: Operating Systems"
            placeholderTextColor={theme.textSecondary}
            value={className}
            onChangeText={setClassName}
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
            placeholder="Ex: CSE 3320"
            placeholderTextColor={theme.textSecondary}
            value={classCode}
            onChangeText={setClassCode}
            autoCapitalize="characters"
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
            placeholder="Ex: ERB"
            placeholderTextColor={theme.textSecondary}
            value={building}
            onChangeText={setBuilding}
            autoCapitalize="characters"
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
            placeholder="Ex: 129"
            placeholderTextColor={theme.textSecondary}
            value={room}
            onChangeText={setRoom}
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

          <Pressable style={styles.addButton} onPress={addClass}>
            <ThemedText style={styles.addButtonText}>
              Add Class
            </ThemedText>
          </Pressable>

          {classes.length > 0 && (
            <ThemedText type="subtitle" style={styles.savedTitle}>
              My Classes
            </ThemedText>
          )}

          {classes.map((item) => (
            <ThemedView
              key={item.id}
              type="backgroundElement"
              style={styles.classCard}
            >
              <ThemedText type="smallBold">
                {item.classCode} - {item.className}
              </ThemedText>

              <ThemedText type="small">
                {item.building} {item.room}
              </ThemedText>

              <ThemedText type="small" themeColor="textSecondary">
                {item.startTime} - {item.endTime}
              </ThemedText>

              <View style={styles.removeContainer}>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeClass(item.id)}
                >
                  <ThemedText style={styles.removeButtonText}>
                    Remove
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },

  note: {
    marginBottom: Spacing.three,
  },

  sectionTitle: {
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
  },

  savedTitle: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },

  classCard: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },

  removeContainer: {
    alignItems: 'flex-start',
    marginTop: Spacing.two,
  },

  removeButton: {
    backgroundColor: '#d9363e',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },

  removeButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});