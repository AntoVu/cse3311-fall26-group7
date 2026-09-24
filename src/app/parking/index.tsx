import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import { ParkingPermitSheet } from '@/components/parking/parking-permit-sheet';
import { ParkingRecommendationCard } from '@/components/parking/parking-recommendation-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSchedule } from '@/context/schedule-context';
import { findBuilding } from '@/data/buildings';
import {
  getParkingPermission,
  hasParkingRule,
  PARKING_COLORS,
  permitFromChoice,
} from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { campusGraph } from '@/routing/campus-graph';
import { findRoute } from '@/routing/route';
import { useSelectedParkingPermit } from '@/state/parking-permit';
import type { CampusLot } from '@/types/map';

export default function ParkingScreen() {
  const theme = useTheme();
  const selectedPermit = useSelectedParkingPermit();
  const permit = permitFromChoice(selectedPermit);
  const [isPermitSheetVisible, setIsPermitSheetVisible] = useState(false);
  // The lot whose walk to class is drawn. Tapping a recommendation sets it.
  const [previewLot, setPreviewLot] = useState<CampusLot | null>(null);
  const { classes } = useSchedule();

  const nextClass = classes.find((scheduleClass) => scheduleClass.status === 'upcoming');
  const destination = nextClass ? findBuilding(nextClass.buildingId) : undefined;
  const previewRoute =
    previewLot && destination
      ? findRoute(campusGraph, previewLot.coordinate, destination.coordinate)
      : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.permitBannerWrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Selected pass: ${selectedPermit}. Tap to change it.`}
            onPress={() => setIsPermitSheetVisible(true)}
            style={[styles.permitBanner, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" numberOfLines={1}>
              Selected Pass: {selectedPermit}
            </ThemedText>
          </Pressable>
        </View>
        <ParkingRecommendationCard
          selectedLotId={previewLot?.id}
          onSelectLot={(lot) => setPreviewLot((current) => (current?.id === lot.id ? null : lot))}
        />
        <CampusMapView
          pois={CAMPUS_POIS}
          mutedBuildings
          route={previewRoute?.path}
          // Lots we have not identified yet keep the neutral look: returning a color here
          // would claim knowledge of a permit rule we do not have. See hasParkingRule.
          getLotColor={(lot) =>
            hasParkingRule(lot.id)
              ? PARKING_COLORS[getParkingPermission(permit, lot.id)]
              : undefined
          }
        />
        <ParkingMapLegend />
      </SafeAreaView>

      <ParkingPermitSheet
        visible={isPermitSheetVisible}
        onClose={() => setIsPermitSheetVisible(false)}
      />
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
  permitBannerWrapper: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  permitBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
});
