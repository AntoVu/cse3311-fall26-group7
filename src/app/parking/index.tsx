import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import { ThemedView } from '@/components/themed-view';
import {
  getParkingPermission,
  PARKING_COLORS,
  PARKING_PERMITS,
  type ParkingPermit,
} from '@/constants/parking-permits';

import { CAMPUS_POIS } from '@/data/campus-pois';

export default function ParkingScreen() {
  const [selectedPermit, setSelectedPermit] =
  useState<ParkingPermit>('East Commuter');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.permitSelector}
        contentContainerStyle={styles.permitSelectorContent}
      >
        {PARKING_PERMITS.map((permit) => (
          <Pressable
            key={permit}
            onPress={() => setSelectedPermit(permit)}
            style={[
              styles.permitButton,
              selectedPermit === permit && styles.selectedPermitButton,
            ]}
          >
            <Text style={styles.permitButtonText}>
              {permit}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
        <CampusMapView
          pois={CAMPUS_POIS}
          mutedBuildings
          getLotColor={(lot) => {
            const permission = getParkingPermission(
              selectedPermit,
              lot.id
            );

            return PARKING_COLORS[permission];
          }}
        />
        <ParkingMapLegend />
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
  permitSelector: {
    flexGrow: 0,
    maxHeight: 55,
  },
  permitSelectorContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  permitButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#444444',
  },
  selectedPermitButton: {
    backgroundColor: '#2563EB',
  },
  permitButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});