export const mockAuthStoreReturn = {
  token: null,
  expiresAt: null,
  deviceId: 'mock-device-id',
  isLoading: false,
  error: null,
  isAuthenticated: false,
  initialize: jest.fn().mockResolvedValue(undefined),
  setToken: jest.fn().mockResolvedValue(undefined),
  clearToken: jest.fn().mockResolvedValue(undefined),
};

export const useAuthStore = jest.fn(() => mockAuthStoreReturn);
export default useAuthStore; 