import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import { ParkingPermitSheet } from '@/components/parking/parking-permit-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  getParkingPermission,
  PARKING_COLORS,
  permitFromChoice,
} from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { useSelectedParkingPermit } from '@/state/parking-permit';

export default function ParkingScreen() {
  const theme = useTheme();
  const selectedPermit = useSelectedParkingPermit();
  const permit = permitFromChoice(selectedPermit);
  const [isPermitSheetVisible, setIsPermitSheetVisible] = useState(false);

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
        <CampusMapView
          pois={CAMPUS_POIS}
          mutedBuildings
          getLotColor={(lot) => PARKING_COLORS[getParkingPermission(permit, lot.id)]}
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
