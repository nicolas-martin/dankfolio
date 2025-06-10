// Mock for @env
let mockAppEnv = 'development';

interface MockModuleExports {
  APP_ENV?: string;
  // Potentially other exports if this pattern is used elsewhere
  // For now, only APP_ENV is needed based on usage.
}

export const setMockAppEnv = (env: string) => {
  mockAppEnv = env;
  // Update the exported value
  (module.exports as MockModuleExports).APP_ENV = env;
};

export let APP_ENV = mockAppEnv;

// For dynamic access in tests
export const getMockAppEnv = () => mockAppEnv; 