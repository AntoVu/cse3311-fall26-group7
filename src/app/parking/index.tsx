import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

import {
  getDistance,
  getEstimatedWalkTime,
  getRecommendedLot,
} from '@/constants/parking-recommendation';
import { CAMPUS_POIS } from '@/data/campus-pois';
import type { PointOfInterest } from '@/types/map';

const PARKING_PERMIT_KEY = 'parkingPermit';

export default function ParkingScreen() {
  const [selectedPermit, setSelectedPermit] =
    useState<ParkingPermit>('East Commuter');
  useFocusEffect(
    useCallback(() => {
      async function loadSavedPermit() {
        const savedPermit = await AsyncStorage.getItem(PARKING_PERMIT_KEY);

        const validPermit = PARKING_PERMITS.find(
          (permit) => permit === savedPermit
        );

        if (validPermit) {
          setSelectedPermit(validPermit);
        }
      }

      loadSavedPermit();
    }, [])
  );
  const [selectedDestination, setSelectedDestination] =
    useState<PointOfInterest | null>(null);

  const recommendedLot = selectedDestination
    ? getRecommendedLot(
      selectedPermit,
      selectedDestination.coordinate
    )
    : null;

  const distanceMiles =
    selectedDestination && recommendedLot
      ? getDistance(
        recommendedLot.coordinate,
        selectedDestination.coordinate
      )
      : null;

  const estimatedWalkMinutes =
    distanceMiles !== null
      ? getEstimatedWalkTime(distanceMiles)
      : null;

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
        {selectedDestination ? (
          <ThemedView style={styles.recommendationCard}>
            <Text style={styles.recommendationText}>
              Destination: {selectedDestination.name}
            </Text>

            <Text style={styles.recommendationText}>
              Recommended parking: {recommendedLot?.label ?? 'No compatible lot found'}
            </Text>

            {distanceMiles !== null && (
              <Text style={styles.recommendationText}>
                Estimated distance: {distanceMiles.toFixed(2)} mi
              </Text>
            )}

            {estimatedWalkMinutes !== null && (
              <Text style={styles.recommendationText}>
                Estimated walk: {estimatedWalkMinutes} min
              </Text>
            )}
          </ThemedView>
        ) : (
          <Text style={styles.instructionText}>
            Tap a building on the map to choose your destination.
          </Text>
        )}

        <CampusMapView
          pois={CAMPUS_POIS}
          mutedBuildings
          onSelectPoi={(poi) => {
            setSelectedDestination(poi);
          }}
          onSelectLot={(lot) => {
            router.push({
              pathname: '/parking/[lotId]',
              params: {
                lotId: lot.id,
                permit: selectedPermit,
              },
            });
          }}
          getLotColor={(lot) => {
            if (recommendedLot?.id === lot.id) {
              return '#2563EB';
            }

            const permission = getParkingPermission(
              selectedPermit,
              lot.id
            );

            return PARKING_COLORS[permission];
          }}
        />
        <ThemedView style={styles.legendContainer}>
          <ParkingMapLegend />
        </ThemedView>
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
  recommendationCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#333333',
  },
  recommendationText: {
    color: '#FFFFFF',
    fontSize: 15,
    marginVertical: 2,
  },
  instructionText: {
    marginHorizontal: 12,
    marginBottom: 8,
    fontSize: 15,
    color: '#FFFFFF',
  },
  legendContainer: {
    paddingBottom: 100,
  },
});