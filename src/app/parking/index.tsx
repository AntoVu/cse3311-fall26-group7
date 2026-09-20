import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CampusMapView } from '@/components/map/campus-map-view';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  getParkingPermission,
  PARKING_COLORS,
  permitFromChoice,
} from '@/constants/parking-permits';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { useSelectedParkingPermit } from '@/state/parking-permit';

export default function ParkingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const selectedPermit = useSelectedParkingPermit();
  const permit = permitFromChoice(selectedPermit);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.permitBannerWrapper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Selected pass: ${selectedPermit}. Tap to change in settings.`}
            onPress={() => router.push('/settings/profile/parking-permit')}
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permitBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
