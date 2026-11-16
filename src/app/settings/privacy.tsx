import { TextPage } from '@/components/settings/text-page';

/** Settings > About > Privacy: what Mavigator keeps, what it sends, and who to ask. */
export default function PrivacyScreen() {
  return (
    <TextPage
      title="Privacy"
      intro="Mavigator is a free student project. It has no accounts, ads, analytics or cookies."
      sections={[
        {
          title: 'What stays on your phone',
          lines: [
            'Your schedule, parking pass, Home, start point, settings and the tips you have seen are saved in this browser only. They are never sent to us.',
            'Settings > Your Profile > Reset Mavigator deletes all of it.',
          ],
        },
        {
          title: 'Your location',
          lines: [
            'If you allow it, your browser gives Mavigator your location to show where you are and plan routes. It is used on your phone and never sent to us or anyone else.',
            'You can turn location off in your browser at any time and drop a pin on the map instead.',
          ],
        },
        {
          title: 'Reports you send',
          lines: [
            'When you send a report, the building, floor, room, the spot you marked and your note go to the Mavigator team and are kept privately on GitHub so we can fix the map. Nothing else about you is sent, so please keep personal information out of the note.',
            'Our report service uses your IP address only for a moment, to limit how many reports can be sent. It stores and logs nothing.',
            'To have a report you sent removed, email us.',
          ],
        },
        {
          title: 'Services we use',
          lines: [
            'The site is hosted on GitHub Pages, and reports pass through Cloudflare. Like any web host, they may record visits (such as IP addresses) under their own privacy policies.',
          ],
        },
        {
          title: 'Children',
          lines: ['Mavigator collects no personal information from anyone, including children under 13.'],
        },
        {
          title: 'Changes',
          lines: ['If anything here changes, we will update this page and its date.'],
        },
      ]}
    />
  );
}
