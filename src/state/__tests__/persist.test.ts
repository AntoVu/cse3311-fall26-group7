import { createStore } from '@/state/create-store';
import { memoryStorage } from '@/state/key-value-storage';
import { persist } from '@/state/persist';

describe('persist', () => {
  it('saves changes and reloads them into a fresh store', () => {
    const storage = memoryStorage();
    const firstStore = createStore('None');
    const unsubscribe = persist(firstStore, 'testPermit', storage);

    firstStore.set('East Commuter');

    expect(storage.getItem('testPermit')).toBe(JSON.stringify('East Commuter'));

    unsubscribe();

    const freshStore = createStore('None');
    const cleanup = persist(freshStore, 'testPermit', storage);

    expect(freshStore.get()).toBe('East Commuter');

    cleanup();
  });

  it('keeps the initial value when the key is missing', () => {
    const store = createStore('None');

    const cleanup = persist(store, 'missingKey', memoryStorage());

    expect(store.get()).toBe('None');

    cleanup();
  });

  it('handles corrupt saved JSON without crashing', () => {
    const storage = memoryStorage();
    storage.setItem('badData', '{not valid json');

    const store = createStore('None');

    expect(() => persist(store, 'badData', storage)).not.toThrow();
    expect(store.get()).toBe('None');
  });

  it('does nothing where the browser storage does not exist', () => {
    const store = createStore('None');

    expect(() => persist(store, 'anyKey')).not.toThrow();
    expect(store.get()).toBe('None');
  });
});
