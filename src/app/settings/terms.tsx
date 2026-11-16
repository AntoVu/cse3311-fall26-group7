import { TextPage } from '@/components/settings/text-page';

/** Settings > About > Terms of use: a student project, not UTA's, and estimates rather than promises. */
export default function TermsScreen() {
  return (
    <TextPage
      title="Terms of use"
      intro="By using Mavigator you agree to these terms."
      sections={[
        {
          title: 'A student project',
          lines: [
            'Mavigator is a free class project by CSE 3311 Team 7 at UT Arlington. It is not affiliated with, endorsed by or run by The University of Texas at Arlington. UTA names and marks belong to UTA.',
          ],
        },
        {
          title: 'Use at your own risk',
          lines: [
            'Mavigator is provided as is, with no warranty. Routes, rooms, parking rules and crowding are estimates and may be wrong or out of date.',
            "Always follow posted signs, UTA Parking & Transportation Services' rules and building access rules. We are not responsible for parking tickets, towing, missed classes or any other loss from using the app.",
            'Do not use the app while driving.',
          ],
        },
        {
          title: 'Your reports',
          lines: ['Send only honest reports, with no personal or offensive content. We may use them to improve the map.'],
        },
        {
          title: 'Map data and code',
          lines: [
            'Map data is © OpenStreetMap contributors under the Open Database License. Indoor maps were traced from UTA building evacuation diagrams; the diagrams themselves are not included.',
            "The app's code is shared under the MIT License.",
          ],
        },
        {
          title: 'Changes',
          lines: ['We may change the app or these terms at any time. This page always shows the latest version.'],
        },
      ]}
    />
  );
}
