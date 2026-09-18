# Expo / React Native Project Context (Windows Environment)

## Commands
- Start dev server: `npx expo start`
- Install packages: `npx expo install <package_name>`
- Typecheck: `npx tsc`

## Rules & Conventions
- Always use `npx expo install` instead of `npm` or `yarn` directly to prevent version mismatches.
- Use React Native primitives (`View`, `Text`, `Pressable`). Web elements (`div`, `span`) are forbidden.
- Text strings must always be enclosed inside a `<Text>` component.
- Use Expo Router for file-based navigation inside the `app/` directory.