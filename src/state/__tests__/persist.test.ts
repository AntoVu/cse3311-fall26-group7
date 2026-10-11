import { createStore } from '@/state/create-store';
import { persist } from '@/state/persist';

describe('persist', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves changes and reloads them into a fresh store', () => {
    const firstStore = createStore('None');
    const unsubscribe = persist(firstStore, 'testPermit');

    firstStore.set('East Commuter');

    expect(localStorage.getItem('testPermit')).toBe(
      JSON.stringify('East Commuter')
    );

    unsubscribe();

    const freshStore = createStore('None');
    const cleanup = persist(freshStore, 'testPermit');

    expect(freshStore.get()).toBe('East Commuter');

    cleanup();
  });

  it('keeps the initial value when the key is missing', () => {
    const store = createStore('None');

    const cleanup = persist(store, 'missingKey');

    expect(store.get()).toBe('None');

    cleanup();
  });

  it('handles corrupt saved JSON without crashing', () => {
    localStorage.setItem('badData', '{not valid json');

    const store = createStore('None');

    expect(() => persist(store, 'badData')).not.toThrow();
    expect(store.get()).toBe('None');
  });
});

const storage: Record<string, string> = {};

const localStorageMock = {
  getItem: jest.fn((key: string) => storage[key] ?? null),

  setItem: jest.fn((key: string, value: string) => {
    storage[key] = value;
  }),

  removeItem: jest.fn((key: string) => {
    delete storage[key];
  }),

  clear: jest.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});