// Mock for firebase/app-check
export const getToken = jest.fn(() => Promise.resolve({ token: 'mock-app-check-token' }));
export const initializeAppCheck = jest.fn();
export const ReCaptchaV3Provider = jest.fn();
export const CustomProvider = jest.fn(); 