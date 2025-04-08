// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
	// Enable Hermes as the default JavaScript engine
	isCSSEnabled: true
});

// Add any custom configuration here
config.resolver.sourceExts.push('mjs');

// Wrap the config
module.exports = wrapWithReanimatedMetroConfig(config);
