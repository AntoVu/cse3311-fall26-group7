import { useState } from 'react';
import { Stack } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const PARKING_PERMITS = [
  'Lot 36',
  'Lot 36 Upgrade',
  'Park North',
  'Park Central',
  'Park South',
  'Lot 45',
  'Maverick Garage',
];

export default function ParkingPermitScreen() {
  const [selectedPermit, setSelectedPermit] = useState('');

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Parking Permit',
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedText type="subtitle">
            Select Parking Permit
          </ThemedText>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.description}
          >
            Select the parking permit that you currently have.
          </ThemedText>

          {PARKING_PERMITS.map((permit) => {
            const isSelected = selectedPermit === permit;

            return (
              <Pressable
                key={permit}
                onPress={() => setSelectedPermit(permit)}
              >
                <ThemedView
                  type={
                    isSelected
                      ? 'backgroundSelected'
                      : 'backgroundElement'
                  }
                  style={styles.permitOption}
                >
                  <View style={styles.row}>
                    <ThemedText type="smallBold">
                      {permit}
                    </ThemedText>

                    {isSelected && (
                      <ThemedText style={styles.checkmark}>
                        ✓
                      </ThemedText>
                    )}
                  </View>
                </ThemedView>
              </Pressable>
            );
          })}

          {selectedPermit !== '' && (
            <ThemedView
              type="backgroundElement"
              style={styles.selectedCard}
            >
              <ThemedText type="smallBold">
                Selected Permit
              </ThemedText>

              <ThemedText>
                {selectedPermit}
              </ThemedText>
            </ThemedView>
          )}
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

  description: {
    marginBottom: Spacing.three,
  },

  permitOption: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  checkmark: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  selectedCard: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 10,
    gap: Spacing.one,
  },
});