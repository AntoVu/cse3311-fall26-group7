import { Platform } from 'react-native';

/**
 * Development-only, web-only. Drops two known react-native-web responder-system messages that
 * Expo would otherwise show as error toasts; every other error still shows. Production builds
 * never log either.
 *
 * 1. "Unknown event handler property" for `on*Responder*`: react-native-svg (15.15.4, unchanged
 *    in 15.15.5) gives every pressable shape the responder props on web, and react-native-web
 *    0.21 passes them straight to the DOM. Dead weight: the tap goes through the `onClick` that
 *    react-native-svg also adds (web/utils/prepare.js). Delete when react-native-svg stops.
 * 2. "Cannot find single active touch." on a pinch: Safari's touch identifiers are huge, and
 *    react-native-web stores touches at `identifier % 20` (createResponderEvent.js), so two
 *    fingers can share a slot; lifting one marks the other gone too. Only PanResponder reads
 *    that touch history, and nothing here uses it. The map's gestures are gesture-handler's.
 */
if (__DEV__ && Platform.OS === 'web') {
  const consoleError = console.error;
  console.error = (...args: unknown[]) => {
    const isSvgResponderWarning =
      typeof args[0] === 'string' &&
      args[0].startsWith('Unknown event handler property') &&
      typeof args[1] === 'string' &&
      /^on(StartShouldSet)?Responder/.test(args[1]);
    const isTouchBankCollision = args[0] === 'Cannot find single active touch.';
    if (!isSvgResponderWarning && !isTouchBankCollision) consoleError(...args);
  };
}
