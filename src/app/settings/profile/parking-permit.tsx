import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import {
    PARKING_PERMITS,
    type ParkingPermit,
} from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';

const PARKING_PERMIT_KEY = 'parkingPermit';

export default function ParkingPermitScreen() {
  const [selectedPermit, setSelectedPermit] =
    useState<ParkingPermit | null>(null);

  useEffect(() => {
    async function loadPermit() {
      const savedPermit = await AsyncStorage.getItem(PARKING_PERMIT_KEY);

      const validPermit =
        PARKING_PERMITS.find((permit) => permit === savedPermit) ?? null;

      setSelectedPermit(validPermit);
    }

    loadPermit();
  }, []);

  async function selectPermit(permit: ParkingPermit) {
    setSelectedPermit(permit);
    await AsyncStorage.setItem(PARKING_PERMIT_KEY, permit);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Parking Permit',
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {PARKING_PERMITS.map((permit) => (
          <Pressable
            key={permit}
            onPress={() => selectPermit(permit)}
            style={[
              styles.permitButton,
              selectedPermit === permit && styles.selectedPermitButton,
            ]}
          >
            <Text style={styles.permitText}>{permit}</Text>
          </Pressable>
        ))}
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  permitButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#444444',
  },
  selectedPermitButton: {
    backgroundColor: '#2563EB',
  },
  permitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});