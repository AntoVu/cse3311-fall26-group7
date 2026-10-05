import { Alert, Platform } from 'react-native';

/**
 * Shows a message, on web as well as native.
 *
 * `Alert.alert` is a no-op under react-native-web, so every caller used to need its own
 * `Platform.OS === 'web'` branch and it was easy to ship a validation message nobody ever saw.
 */
export function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/**
 * Asks a yes/no question, on web as well as native. Resolves true when confirmed.
 *
 * Native alerts are callback-based and the web `confirm` is synchronous; this hands both back
 * as a promise so callers read the same either way.
 */
export function confirmAction(title: string, message: string, confirmLabel = 'OK'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
