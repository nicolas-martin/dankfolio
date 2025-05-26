// Mock for @/services/firebaseInit


export const initializeFirebaseServices = jest.fn().mockResolvedValue(undefined);

export const getAppCheckInstance = jest.fn(() => ({
  app: { name: 'mock-app' },
  options: {},
}));

export const getFirebaseApp = jest.fn().mockReturnValue({ name: 'mock-firebase-app' }); 