import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { Colors } from '@/constants/theme';

// The page every web route is rendered into (web only; native never uses it). Mavigator ships
// as a mobile website, so this is what makes it behave like an app in a phone browser.
// EXPO_BASE_URL is the GitHub Pages subpath from app.json's experiments.baseUrl.
const base = process.env.EXPO_BASE_URL ?? '';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover makes env(safe-area-inset-*) work, so SafeAreaView clears the
            notch and home bar. maximum-scale=1 keeps a pinch on the map from zooming the page. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={Colors.light.backgroundElement} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={Colors.dark.backgroundElement} />
        {/* Add to Home Screen: open full screen, with its own name and icon. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Home Screen app: draw under the status bar so the map fills it. iOS reads this only
            when the site is added, so re-add it after changing this. */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mavigator" />
        <link rel="apple-touch-icon" href={`${base}/icon-192.png`} />
        <link rel="manifest" href={`${base}/manifest.webmanifest`} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: pageStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// overscroll-behavior: no pull-to-refresh or rubber-banding while panning the map.
// The body background matches the theme so the page never flashes white in dark mode.
// body::before: a dark fade behind the status bar so its white clock stays readable on light
// screens. Its height is the top safe-area inset, so it only appears in the Home Screen app.
const pageStyle = `
html, body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  background-color: ${Colors.light.background};
}
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: env(safe-area-inset-top);
  background: linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0));
  pointer-events: none;
  z-index: 10000;
}
@media (prefers-color-scheme: dark) {
  html, body { background-color: ${Colors.dark.background}; }
}`;
