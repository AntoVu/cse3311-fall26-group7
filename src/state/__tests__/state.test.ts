import { Appearance } from 'react-native';

import { NO_PERMIT } from '@/constants/parking-permits';
import { createStore } from '@/state/create-store';
import { parkingPermitStore } from '@/state/parking-permit';
import { setThemePreference, themePreferenceStore } from '@/state/theme-preference';

describe('createStore', () => {
  it('returns the latest value and notifies subscribers only on change', () => {
    const store = createStore(1);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(2);
    store.set(2);
    expect(store.get()).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set(3);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('parkingPermitStore', () => {
  it('defaults to no permit', () => {
    expect(parkingPermitStore.get()).toBe(NO_PERMIT);
  });
});

describe('theme preference', () => {
  it('defaults to following the device', () => {
    expect(themePreferenceStore.get()).toBe('system');
  });

  it('overrides the native scheme for light/dark and resets it for device', () => {
    const spy = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});

    setThemePreference('dark');
    expect(themePreferenceStore.get()).toBe('dark');
    expect(spy).toHaveBeenLastCalledWith('dark');

    setThemePreference('system');
    expect(themePreferenceStore.get()).toBe('system');
    expect(spy).toHaveBeenLastCalledWith('unspecified');

    spy.mockRestore();
  });
});
