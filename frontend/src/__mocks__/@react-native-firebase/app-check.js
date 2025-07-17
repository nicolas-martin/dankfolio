export default () => ({
  getToken: jest.fn(() => Promise.resolve({ token: 'mock-token' })),
});
