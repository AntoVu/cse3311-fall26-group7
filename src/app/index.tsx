import { Redirect } from 'expo-router';

// Landing page still required
export default function Index() {
  return <Redirect href="/map" />;
}
