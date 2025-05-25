// Mock for @/services/grpc/authManager

export interface AuthToken {
  token: string;
  expiresAt: Date;
}

export const authManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getValidToken: jest.fn().mockResolvedValue(null),
  setToken: jest.fn().mockResolvedValue(undefined),
  clearToken: jest.fn().mockResolvedValue(undefined),
  clearAllAuthData: jest.fn().mockResolvedValue(undefined),
  hasValidToken: jest.fn().mockResolvedValue(false),
  generateTokenRequest: jest.fn().mockReturnValue({
    deviceId: 'mock-device-id',
    platform: 'mobile'
  })
}; 