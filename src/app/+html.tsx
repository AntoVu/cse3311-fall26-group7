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
        <link rel="apple-touch-icon" href={`${base}/apple-touch-icon.png`} />
        <link rel="manifest" href={`${base}/manifest.webmanifest`} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: pageStyle + splashStyle }} />
        {/* The Settings theme, before the first frame, so the splash isn't the wrong color. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* First in the page, so it shows from the first bytes, before the pre-rendered app below. */}
        <div id="splash" aria-hidden="true" dangerouslySetInnerHTML={{ __html: splashMarkup }} />
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
        {children}
      </body>
    </html>
  );
}

// overscroll-behavior: no pull-to-refresh or rubber-banding while panning the map.
// Height: in the Home Screen app (black-translucent status bar) iOS makes ScrollViewStyleReset's
// `height: 100%` come up short of the screen, leaving a strip under the tab bar. 100dvh is the
// real visible height there, and the same as 100% in a normal browser tab.
// The background is the tab bar's color (backgroundElement), so anything showing past the app,
// like the home-indicator area, reads as part of the tab bar. _layout.tsx keeps it in step with
// the Settings theme after load; these media-query values cover the first paint.
// Focus rings: text fields show their caret, so they get none (iOS Safari draws a blue box otherwise);
// buttons keep theirs for keyboard users only (:focus-visible), not after a tap or click.
// body::before: a dark fade behind the status bar so its white clock stays readable on light
// screens. Its height is the top safe-area inset, so it only appears in the Home Screen app.
const pageStyle = `
html, body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  background-color: ${Colors.light.backgroundElement};
}
input:focus, textarea:focus { outline: none; }
[tabindex]:focus:not(:focus-visible) { outline: none; }
@supports (height: 100dvh) {
  html, body, #root { height: 100dvh; }
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
  html, body { background-color: ${Colors.dark.backgroundElement}; }
}
/* Press feedback for action buttons (marked data-ripple, components/ui/ripple.ts): a circle grows
   from the middle, stays while held, fades on release. Drawn over the button and clipped to it. */
:root { --press: rgba(0, 0, 0, 0.16); }
:root[data-theme='dark'] { --press: rgba(255, 255, 255, 0.16); }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { --press: rgba(255, 255, 255, 0.16); }
}
[data-ripple]::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--press);
  pointer-events: none;
  opacity: 0;
  clip-path: circle(71% at 50% 50%);
  transition: opacity 0.3s ease-out;
}
[data-ripple]:not([aria-disabled='true']):active::after {
  opacity: 1;
  transition: none;
  animation: press-ripple 0.35s ease-out;
}
@keyframes press-ripple {
  from { clip-path: circle(0% at 50% 50%); }
  to { clip-path: circle(71% at 50% 50%); }
}
@media (prefers-reduced-motion: reduce) {
  [data-ripple]:active::after { animation: none; }
}`;

/*
 * The loading screen. Plain HTML and CSS here, not React: the app's code is what takes the time to
 * download, so anything drawn by it would only appear once the wait is over. The browser draws this
 * at once and runs it on the graphics thread (only transform and opacity animate), so it stays
 * smooth while the app's code downloads and starts.
 *
 * The pin fills the screen, shrinks and slides left, then "Mavigator" slides out from behind it.
 * _layout.tsx calls window.__hideSplash() once the app is up: it waits for the logo to finish,
 * then fades. Still loading after that, a spinner shows under the logo. Reduce Motion skips the
 * movement. Light: white with black text; dark: the map's dark gray with white text.
 */
const SPLASH_DARK = Colors.dark.backgroundElement;
// The pin from assets/images/icon-transparent.svg, its viewBox cut to the pin (40 x 64 px here).
const splashMarkup = `
<div class="splash-mark">
  <div class="splash-clip"><span class="splash-word">Mavigator</span></div>
  <svg class="splash-pin" viewBox="226 58 572 908" width="40" height="64"><path d="M 512 962.0 C 413.6 708.9 230.75 540.1 230.75 343.2 A 281.25 281.25 0 1 1 793.25 343.2 C 793.25 540.1 610.4 708.9 512 962.0 Z" fill="#0064B1"/><circle cx="512" cy="343.2" r="174.4" fill="#FFFFFF"/><polygon points="512.0,213.9 543.6,311.0 645.7,311.0 563.1,371.1 594.7,468.3 512.0,408.2 429.3,468.3 460.9,371.1 378.3,311.0 480.4,311.0" fill="#F58025"/></svg>
</div>
<div class="splash-spinner"></div>`;

const splashStyle = `
#splash {
  position: fixed; inset: 0; z-index: 10001;
  background: #ffffff; color: #000000;
  transition: opacity 0.3s ease;
}
@media (prefers-color-scheme: dark) { #splash { background: ${SPLASH_DARK}; color: #ffffff; } }
html[data-theme='light'] #splash { background: #ffffff; color: #000000; }
html[data-theme='dark'] #splash { background: ${SPLASH_DARK}; color: #ffffff; }
#splash.splash-out { opacity: 0; pointer-events: none; }
.splash-mark {
  position: absolute; left: 50%; top: 50%; width: 0; height: 0;
  will-change: transform;
  animation: splash-mark 0.7s cubic-bezier(0.65, 0, 0.35, 1) 0.25s both;
}
.splash-pin { position: absolute; left: -20px; top: -32px; z-index: 1; }
/* Starts at the pin's middle, so the word comes out from under it. */
.splash-clip { position: absolute; left: 0; top: -30px; height: 60px; width: var(--splash-word, 260px); overflow: hidden; }
.splash-word {
  display: inline-block; padding-left: 30px;
  font: 800 44px/60px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: -0.5px; white-space: nowrap;
  will-change: transform;
  animation: splash-word 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.85s both;
}
.splash-spinner {
  position: absolute; left: 50%; top: calc(50% + 64px);
  width: 26px; height: 26px; margin-left: -13px;
  border: 3px solid currentColor; border-right-color: transparent; border-radius: 50%;
  opacity: 0;
  animation: splash-fade 0.3s ease 1.8s forwards, splash-spin 0.8s linear infinite;
}
@keyframes splash-mark {
  from { transform: translateX(0) scale(4); }
  to { transform: translateX(calc(var(--splash-shift, 120px) * -1)) scale(1); }
}
@keyframes splash-word { from { transform: translateX(-100%); } to { transform: translateX(0); } }
@keyframes splash-fade { to { opacity: 0.45; } }
@keyframes splash-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .splash-mark, .splash-word { animation: none; }
  .splash-mark { transform: translateX(calc(var(--splash-shift, 120px) * -1)); }
}`;

// Saved by persist() as JSON ('"dark"'); "system" leaves it to the media query.
const themeScript = `document.addEventListener('touchstart', function () {}, { passive: true });
try {
  var theme = JSON.parse(localStorage.getItem('themePreference') || 'null');
  if (theme === 'dark' || theme === 'light') document.documentElement.setAttribute('data-theme', theme);
} catch (e) {}`;

// Measures the word so the finished logo is centered, and defines the hide _layout.tsx calls.
const splashScript = `(function () {
  var splash = document.getElementById('splash');
  if (!splash) return;
  var word = splash.querySelector('.splash-word').offsetWidth;
  splash.style.setProperty('--splash-word', word + 'px');
  splash.style.setProperty('--splash-shift', (word - 20) / 2 + 'px');
  var shown = Date.now();
  var LOGO_MS = 1500;
  window.__hideSplash = function () {
    window.__hideSplash = function () {};
    setTimeout(function () {
      splash.classList.add('splash-out');
      setTimeout(function () { splash.remove(); }, 350);
    }, Math.max(0, LOGO_MS - (Date.now() - shown)));
  };
})();`;
