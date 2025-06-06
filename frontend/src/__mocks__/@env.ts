// Mock for @env
let mockAppEnv = 'development';

export const setMockAppEnv = (env: string) => {
  mockAppEnv = env;
  // Update the exported value
  (module.exports as any).APP_ENV = env;
};

export const APP_ENV = mockAppEnv;

// For dynamic access in tests
export const getMockAppEnv = () => mockAppEnv; 