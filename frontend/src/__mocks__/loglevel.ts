// frontend/src/__mocks__/loglevel.ts

const noop = () => {};

const mockLoglevel = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  setLevel: noop,
  enableAll: noop,
  disableAll: noop,
  getLevel: () => 0, // Corresponds to 'trace' or a sensible default
  levels: {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    SILENT: 5,
  },
  methodFactory: () => noop,
  getLogger: () => mockLoglevel, // Return itself for getLogger
  noConflict: () => mockLoglevel, // Return itself for noConflict
  setDefaultLevel: noop,
};

export default mockLoglevel;
