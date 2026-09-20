import { StyleSheet, TextInput } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder: string;
  defaultTime?: string;
};

// Web isn't a target platform and has no native time picker, so this is just a text box
// (type a time like "10:05 AM"). The real picker is time-picker-field.tsx.
export function TimePickerField({ label, value, onChange, placeholder }: TimePickerFieldProps) {
  const theme = useTheme();

  return (
    <TextInput
      accessibilityLabel={label}
      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      value={value}
      onChangeText={onChange}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: Spacing.two,
  },
});
