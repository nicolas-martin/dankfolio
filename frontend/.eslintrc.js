module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all', // Using 'all' preset for react-native
    'prettier', // Make sure this is the last one
  ],
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    // Add any project-specific rules here
  },
  settings: {
    react: {
      version: 'detect', // Automatically detect the React version
    },
  },
  env: {
    'jest': true, // For Jest global variables
    'react-native/react-native': true, // For React Native global variables
  },
};
