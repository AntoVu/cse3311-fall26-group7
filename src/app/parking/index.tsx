import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { CampusMapView } from '@/components/map/campus-map-view';
import { ParkingDrawer } from '@/components/parking/parking-drawer';
import { ParkingPermitSheet } from '@/components/parking/parking-permit-sheet';
import { ThemedView } from '@/components/themed-view';
import { useSchedule } from '@/context/schedule-context';
import { findBuilding } from '@/data/buildings';
import {
  getParkingPermission,
  hasParkingRule,
  PARKING_COLORS,
  permitFromChoice,
} from '@/constants/parking-permits';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { campusGraph } from '@/routing/campus-graph';
import { findRoute } from '@/routing/route';
import { useSelectedParkingPermit } from '@/state/parking-permit';
import type { CampusLot } from '@/types/map';

export default function ParkingScreen() {
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

  // The map fills the screen, status bar included; the pass chip and drawer float over it.
  return (
    <ThemedView style={styles.container}>
      <CampusMapView
        pois={CAMPUS_POIS}
        mutedBuildings
        route={previewRoute?.path}
        // Lots we have not identified yet keep the neutral look: returning a color here
        // would claim knowledge of a permit rule we do not have. See hasParkingRule.
        getLotColor={(lot) =>
          hasParkingRule(lot.id) ? PARKING_COLORS[getParkingPermission(permit, lot.id)] : undefined
        }
      />
      <ParkingDrawer
        permitLabel={selectedPermit}
        selectedLotId={previewLot?.id}
        onSelectLot={(lot) => setPreviewLot((current) => (current?.id === lot.id ? null : lot))}
        onOpenPermit={() => setIsPermitSheetVisible(true)}
      />

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
});
