export default {
  initializeApp: jest.fn(() => Promise.resolve()),
  app: jest.fn(() => ({
    onReady: jest.fn(() => Promise.resolve()),
    appCheck: jest.fn(() => ({
      getToken: jest.fn(() => Promise.resolve({ token: 'mock-token' })),
    })),
  })),
};
