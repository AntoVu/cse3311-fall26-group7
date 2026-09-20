import { Stack } from 'expo-router';
import { useState } from 'react';
import {
    Appearance,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type ThemeOption = 'light' | 'dark';

export default function ThemeScreen() {
  const [selectedTheme, setSelectedTheme] =
    useState<ThemeOption>('light');

  function changeTheme(theme: ThemeOption) {
    setSelectedTheme(theme);
    Appearance.setColorScheme(theme);
  }

  const themes: {
    label: string;
    value: ThemeOption;
  }[] = [
    {
      label: 'Light',
      value: 'light',
    },
    {
      label: 'Dark',
      value: 'dark',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Theme',
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="subtitle">
          Choose Theme
        </ThemedText>

        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.description}
        >
          Select how you want the app to appear.
        </ThemedText>

        {themes.map((theme) => {
          const isSelected = selectedTheme === theme.value;

          return (
            <Pressable
              key={theme.value}
              onPress={() => changeTheme(theme.value)}
            >
              <ThemedView
                type={
                  isSelected
                    ? 'backgroundSelected'
                    : 'backgroundElement'
                }
                style={styles.themeOption}
              >
                <View style={styles.row}>
                  <ThemedText type="smallBold">
                    {theme.label}
                  </ThemedText>

                  {isSelected && (
                    <ThemedText style={styles.checkmark}>
                      ✓
                    </ThemedText>
                  )}
                </View>
              </ThemedView>
            </Pressable>
          );
        })}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },

  description: {
    marginBottom: Spacing.three,
  },

  themeOption: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  checkmark: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});