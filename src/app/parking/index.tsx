import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { CampusMapView } from '@/components/map/campus-map-view';
import { ParkingDrawer } from '@/components/parking/parking-drawer';
import { ParkingPermitSheet } from '@/components/parking/parking-permit-sheet';
import { ThemedView } from '@/components/themed-view';
import { useSchedule } from '@/context/schedule-context';
import {
  getParkingPermission,
  hasParkingRule,
  PARKING_COLORS,
  permitFromChoice,
} from '@/constants/parking-permits';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { usePlaceRoute } from '@/hooks/use-place-route';
import { useSelectedParkingPermit } from '@/state/parking-permit';
import type { CampusLot } from '@/types/map';

export default function ParkingScreen() {
  const selectedPermit = useSelectedParkingPermit();
  const permit = permitFromChoice(selectedPermit);
  const [isPermitSheetVisible, setIsPermitSheetVisible] = useState(false);
  // The lot whose walk to class is drawn. Tapping a recommendation sets it.
  const [previewLot, setPreviewLot] = useState<CampusLot | null>(null);
  const { classes, currentTime } = useSchedule();

  const nextClass = classes.find((scheduleClass) => scheduleClass.status === 'upcoming');
  // The same route a class gets, but from the lot: drawn up to the building's door.
  const { destination, legs } = usePlaceRoute(
    previewLot && nextClass ? { buildingId: nextClass.buildingId, room: nextClass.roomNumber } : null,
    previewLot ? { kind: 'lot', lotId: previewLot.id } : undefined
  );
  const previewPath = legs?.outdoor?.path;

  // The map fills the screen, status bar included; the pass chip and drawer float over it.
  return (
    <ThemedView style={styles.container}>
      <CampusMapView
        pois={CAMPUS_POIS}
        mutedBuildings
        route={previewPath}
        routeEnds={previewPath ? { start: previewLot?.id, destination: destination?.id } : undefined}
        // Lots we have not identified yet keep the neutral look: returning a color here
        // would claim knowledge of a permit rule we do not have. See hasParkingRule.
        getLotColor={(lot) =>
          hasParkingRule(lot.id) ? PARKING_COLORS[getParkingPermission(permit, lot.id, currentTime)] : undefined
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
