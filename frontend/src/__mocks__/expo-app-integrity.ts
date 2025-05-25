// Mock for expo-app-integrity
export const getAppIntegrityTokenAsync = jest.fn(() => Promise.resolve('mock-integrity-token'));
export const isAvailableAsync = jest.fn(() => Promise.resolve(true));

export default {
  getAppIntegrityTokenAsync,
  isAvailableAsync,
}; 