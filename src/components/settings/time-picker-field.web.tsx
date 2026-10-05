import { createElement } from 'react';

import { fromInputTime, TIME_STEP_MINUTES, toInputTime } from '@/components/settings/time-format';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type TimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder: string;
  defaultTime?: string;
};

// A plain <input type="time">, so phone browsers open their own scroll-wheel time picker.
// The one deliberate exception to AGENTS.md's "no web elements" rule: react-native-web's
// TextInput cannot set `type`, and this .web file is never bundled for native (the native
// picker is time-picker-field.tsx). The schedule stores "1:30 PM"; the input speaks "13:30".
export function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  return createElement('input', {
    type: 'time',
    'aria-label': label,
    step: TIME_STEP_MINUTES * 60,
    value: toInputTime(value),
    onChange: (event: { target: { value: string } }) => onChange(fromInputTime(event.target.value)),
    style: {
      boxSizing: 'border-box',
      width: '100%',
      border: 'none',
      borderRadius: 10,
      padding: `12px ${Spacing.three}px`,
      fontSize: 16, // 16px or more stops iOS Safari zooming the page on focus.
      fontFamily: 'inherit',
      marginBottom: Spacing.two,
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      colorScheme: colorScheme === 'dark' ? 'dark' : 'light',
    },
  });
}
