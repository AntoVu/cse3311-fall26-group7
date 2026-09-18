import { Redirect } from 'expo-router';

// Iteration 1 makes the Map tab the landing screen. This file only still exists
// because file deletion isn't available through the current bridge session for
// this folder — delete it outright once that's possible (see chat).
export default function Index() {
  return <Redirect href="/map" />;
}
