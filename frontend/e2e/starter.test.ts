import { device, element, by, expect } from 'detox';

describe('App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show development build screen', async () => {
    // Wait for the development build screen to be visible
    await expect(element(by.id('DevLauncherMainScreen'))).toBeVisible();
    
    // Check that the app title is visible
    await expect(element(by.text('dankfolio'))).toBeVisible();
    
    // Check that development build text is visible
    await expect(element(by.text('Development Build'))).toBeVisible();
  });

  it('should have development servers section', async () => {
    // Check that development servers section is visible
    await expect(element(by.text('Development servers'))).toBeVisible();
    
    // Check that the start server instruction is visible
    await expect(element(by.text('Start a local development server with:'))).toBeVisible();
  });
});
