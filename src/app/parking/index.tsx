import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { CampusMapView } from '@/components/map/campus-map-view';
import { PoiInfoSheet } from '@/components/map/poi-info-sheet';
import { ParkingDrawer } from '@/components/parking/parking-drawer';
import { ParkingPermitSheet } from '@/components/parking/parking-permit-sheet';
import { ThemedView } from '@/components/themed-view';
import { useSchedule } from '@/context/schedule-context';
import {
  formatHour,
  getParkingPermission,
  lotsOpeningAt,
  lotStatus,
  PARKING_COLORS,
  permitFromChoice,
} from '@/constants/parking-permits';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { findBuilding } from '@/data/buildings';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { usePlaceRoute } from '@/hooks/use-place-route';
import { formatDistance, formatDuration } from '@/routing/format';
import { useDistanceUnit } from '@/state/distance-unit';
import { useSelectedParkingPermit } from '@/state/parking-permit';
import { parkingTargetStore, useParkingTarget } from '@/state/parking-target';
import type { CampusLot, PointOfInterest } from '@/types/map';

const LOT_IDS = CAMPUS_LOTS.map((lot) => lot.id);

export default function ParkingScreen() {
  const selectedPermit = useSelectedParkingPermit();
  const permit = permitFromChoice(selectedPermit);
  const [isPermitSheetVisible, setIsPermitSheetVisible] = useState(false);
  // The lot whose walk to class is drawn. Tapping a recommendation sets it.
  const [previewLot, setPreviewLot] = useState<CampusLot | null>(null);
  const { classes, currentTime } = useSchedule();
  const openingHour = lotsOpeningAt(permit, LOT_IDS, currentTime);
  // A building tapped on the map: its popup offers to park for it instead of the next class.
  const [tappedPoi, setTappedPoi] = useState<PointOfInterest | null>(null);
  const target = findBuilding(useParkingTarget() ?? '');
  const unit = useDistanceUnit();

  const nextClass = classes.find((scheduleClass) => scheduleClass.status === 'upcoming');
  // The same route a class gets, but from the lot: drawn up to the building's door. To the building
  // picked on the map if there is one, else to the next class's room.
  const walkTarget = target
    ? { buildingId: target.id }
    : nextClass
      ? { buildingId: nextClass.buildingId, room: nextClass.roomNumber }
      : null;
  const walkTo = target ? target.name : nextClass?.courseCode;
  const { destination, legs, route } = usePlaceRoute(
    previewLot ? walkTarget : null,
    previewLot ? { kind: 'lot', lotId: previewLot.id } : undefined
  );
  const previewPath = legs?.outdoor?.path;
  const toggleLot = (lot: CampusLot) => setPreviewLot((current) => (current?.id === lot.id ? null : lot));
  // The tapped lot's card (FR-PRK-15): may this pass park there, and the walk to the next class.
  const lotCard = previewLot
    ? {
        title: previewLot.label.trim() || 'Unnamed lot',
        status: lotStatus(permit, previewLot.id, currentTime),
        walk: !walkTo
          ? 'No class left today to walk to.'
          : route
            ? `${formatDuration(route.etaMinutes)} walk to ${walkTo} (${formatDistance(route.totalDistanceMeters, unit)})`
            : `Working out the walk to ${walkTo}…`,
      }
    : undefined;

  // The map fills the screen, status bar included; the pass chip and drawer float over it.
  return (
    <ThemedView style={styles.container}>
      <CampusMapView
        pois={CAMPUS_POIS}
        mutedBuildings
        route={previewPath}
        routeEnds={previewPath ? { start: previewLot?.id, destination: destination?.id } : undefined}
        onSelectLot={toggleLot}
        onSelectPoi={setTappedPoi}
        // A lot no pass covers is red like any other lot the pass can't use.
        getLotColor={(lot) => PARKING_COLORS[getParkingPermission(permit, lot.id, currentTime)]}
      />
      <ParkingDrawer
        permitLabel={selectedPermit}
        selectedLotId={previewLot?.id}
        lotCard={lotCard}
        notice={openingHour === null ? undefined : `Yellow lots open to your pass at ${formatHour(openingHour)}`}
        onClearLot={() => setPreviewLot(null)}
        onSelectLot={toggleLot}
        onOpenPermit={() => setIsPermitSheetVisible(true)}
      />

      <PoiInfoSheet
        poi={tappedPoi}
        outdoorOnly
        actionLabel="Park for this building"
        onClose={() => setTappedPoi(null)}
        onSetDestination={(poi) => {
          parkingTargetStore.set(poi.id);
          setTappedPoi(null);
          setPreviewLot(null);
        }}
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
