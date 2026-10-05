import { Stack } from 'expo-router';

// Keeps the settings root under any deep link (e.g. the Parking tab's pass button) so
// the back button always has somewhere to go.
export const unstable_settings = { anchor: 'index' };

export default function SettingsLayout() {
  // 'minimal' = chevron-only back button (no previous-screen title) on every settings page.
  return <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }} />;
}
