import { dismissTip, finishWelcome, onboardingStore, replayOnboarding } from '@/state/onboarding';

describe('onboarding', () => {
  beforeEach(replayOnboarding);

  it('starts with the welcome and no tips seen', () => {
    expect(onboardingStore.get()).toEqual({ welcomed: false, tipsSeen: [] });
  });

  it('remembers the welcome and each tip once', () => {
    finishWelcome();
    dismissTip('map');
    dismissTip('map');
    dismissTip('route-start');
    expect(onboardingStore.get()).toEqual({ welcomed: true, tipsSeen: ['map', 'route-start'] });
  });

  it('replays everything from Settings', () => {
    finishWelcome();
    dismissTip('parking');
    replayOnboarding();
    expect(onboardingStore.get()).toEqual({ welcomed: false, tipsSeen: [] });
  });
});
