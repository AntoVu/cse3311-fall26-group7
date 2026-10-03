import { Platform } from 'react-native';

/**
 * Development-only, web-only. react-native-svg (15.15.4, unchanged in 15.15.5) gives every
 * pressable shape the React Native "responder" props (`onStartShouldSetResponder`,
 * `onResponderGrant`, ...) on web, and react-native-web 0.21 passes them straight to the DOM
 * element, so React logs "Unknown event handler property" for each one and Expo shows it as an
 * error toast. They are dead weight: the tap itself goes through the `onClick` that
 * react-native-svg also adds (web/utils/prepare.js), and tapping buildings works. Production
 * builds never log it. Drops exactly that warning for exactly those props; every other error
 * still shows. Delete this file when react-native-svg stops adding them.
 */
if (__DEV__ && Platform.OS === 'web') {
  const consoleError = console.error;
  console.error = (...args: unknown[]) => {
    const isSvgResponderWarning =
      typeof args[0] === 'string' &&
      args[0].startsWith('Unknown event handler property') &&
      typeof args[1] === 'string' &&
      /^on(StartShouldSet)?Responder/.test(args[1]);
    if (!isSvgResponderWarning) consoleError(...args);
  };
}
