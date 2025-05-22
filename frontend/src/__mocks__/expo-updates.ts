// Mock for expo-updates
export const useUpdates = () => ({
  updates: [],
  availableUpdate: null,
  isUpdateAvailable: false,
  isUpdatePending: false,
  lastCheckForUpdateTimeSinceRestart: null,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
});

export const currentlyRunning = {
  updateId: 'mockUpdateId',
  isEmbeddedLaunch: true,
};

export const checkForUpdateAsync = jest.fn();
export const fetchUpdateAsync = jest.fn();
export const reloadAsync = jest.fn();
