// Mock for firebase/app
export const initializeApp = jest.fn(() => ({ name: 'mock-app' }));
export const getApps = jest.fn(() => []);
export const getApp = jest.fn(() => ({ name: 'mock-app' }));
export const deleteApp = jest.fn(() => Promise.resolve()); 