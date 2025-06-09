import { device, element, by, expect } from 'detox';

describe('App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should have welcome screen', async () => {
    // This is a placeholder testID.
    // It will need to be updated to a real testID from the app's main screen.
    await expect(element(by.id('mock-navigation'))).toBeVisible();
  });
});
