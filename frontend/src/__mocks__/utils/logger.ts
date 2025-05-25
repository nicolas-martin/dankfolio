// Mock for @/utils/logger

export const logger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  exception: jest.fn(),
  breadcrumb: jest.fn(),
}; 