/**
 * Spread onto a Pressable that is an action button (Add Class, Send report, a Settings row) to give
 * it the press ripple drawn by +html.tsx's CSS. Tabs, drawers, chips and list rows don't get it.
 * Web only: react-native-web turns `dataSet` into a data-ripple attribute; native ignores it.
 */
// RN's Pressable types don't list dataSet, so it goes in as an untyped spread.
export const RIPPLE = { dataSet: { ripple: 'on' } } as object;
