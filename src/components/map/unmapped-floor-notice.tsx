import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { OverlayChip } from '@/components/map/map-overlays';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { unmappedFloorNote } from '@/routing/floors';
import type { IndoorFloorPlan } from '@/types/map';

/**
 * A red-edged banner over an indoor map when its floor is marked not mapped (diagram missing or out of date).
 * What is traced still shows underneath. Renders nothing on any other floor; the caller places it.
 */
export function UnmappedFloorNotice({
  plan,
  level,
  style,
}: {
  plan: IndoorFloorPlan | undefined;
  level: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const note = unmappedFloorNote(plan, level);
  if (!note) return null;
  return (
    <View pointerEvents="none" style={[styles.row, style]}>
      <OverlayChip style={[styles.chip, { borderColor: theme.danger }]}>
        <ThemedText type="small">{note}</ThemedText>
      </OverlayChip>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', flexDirection: 'row' },
  chip: { borderWidth: 1, flexShrink: 1 },
});
