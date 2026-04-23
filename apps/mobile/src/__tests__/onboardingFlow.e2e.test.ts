import { ONBOARDING_STEPS } from '../screens/auth/onboardingSteps';

describe('mobile onboarding critical flow', () => {
  it('contains three-step activation journey with benchmark promise', () => {
    expect(ONBOARDING_STEPS).toHaveLength(3);
    expect(ONBOARDING_STEPS[1].toLowerCase()).toContain('benchmark');
  });
});
