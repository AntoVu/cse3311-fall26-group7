import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Spacing } from '@/constants/theme';

/** Pick a floor, then one of its rooms. `floors` comes from buildingRooms(). */
export function RoomPicker({
  floors,
  level,
  room,
  onChange,
}: {
  floors: { level: string; rooms: string[] }[];
  level: string;
  room: string;
  onChange: (level: string, room: string) => void;
}) {
  const shown = floors.find((floor) => floor.level === level) ?? floors[0];
  if (!shown) return null;

  return (
    <View style={styles.picker}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Floor" style={styles.row}>
        {floors.map((floor) => (
          <Chip
            key={floor.level}
            label={floor.level}
            selected={floor.level === shown.level}
            onPress={() => onChange(floor.level, floor.rooms[0])}
          />
        ))}
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Room" style={styles.row}>
        {shown.rooms.map((candidate) => (
          <Chip
            key={candidate}
            label={candidate}
            selected={candidate === room}
            onPress={() => onChange(shown.level, candidate)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
});
