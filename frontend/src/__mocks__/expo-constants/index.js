export default {
  expoConfig: {
    extra: {
      REACT_APP_API_URL: 'http://localhost:8080',
      REACT_APP_SOLANA_RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com',
      DEBUG_MODE: 'false',
      APP_ENV: 'test',
      SENTRY_AUTH_TOKEN: 'test-token',
    },
  },
};
