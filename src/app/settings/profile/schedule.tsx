import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ManualAddClassForm } from '@/components/schedule/manual-add-class-form';
import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';

export default function ProfileScheduleScreen() {
  const { classes, removeClass } = useSchedule();

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

  function handleRemoveClass(id: string, code: string) {
    const message = `Are you sure you want to remove ${code} from your schedule?`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        removeClass(id);
      }
    } else {
      Alert.alert('Remove Class', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeClass(id),
        },
      ]);
    }
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

          <ManualAddClassForm />

          {classes.length > 0 && (
            <ThemedText type="subtitle" style={styles.savedTitle}>
              My Classes
            </ThemedText>
          )}

          {classes.map((item) => (
            <ThemedView key={item.id} type="backgroundElement" style={styles.classCard}>
              <ThemedText type="smallBold">
                {item.courseCode} - {item.courseName}
              </ThemedText>

              <ThemedText type="small">
                {item.buildingCode} {item.roomNumber}
              </ThemedText>

              <ThemedText type="small" themeColor="textSecondary">
                {item.startTime} - {item.endTime}
              </ThemedText>

              <View style={styles.removeContainer}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.courseCode}`}
                  style={styles.removeButton}
                  onPress={() => handleRemoveClass(item.id, item.courseCode)}
                >
                  <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
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