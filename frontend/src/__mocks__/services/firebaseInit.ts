// Mock for @/services/firebaseInit

const mockAppCheckInstance = {
  app: {},
  // Add other properties if needed
};

export const initializeFirebaseServices = jest.fn().mockResolvedValue(undefined);

export const getAppCheckInstance = jest.fn().mockReturnValue(mockAppCheckInstance);

export const getFirebaseApp = jest.fn().mockReturnValue({ name: 'mock-firebase-app' }); 