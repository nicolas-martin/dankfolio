// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
	// Enable Hermes as the default JavaScript engine
	isCSSEnabled: true
});

// NOTE: Do i need this here since it's in the bableconfig?
// config.resolver.extraNodeModules = {
// 	'@assets': path.resolve(__dirname, 'assets')
// };

// Add any custom configuration here
config.resolver.sourceExts.push('mjs');

// Wrap the config
module.exports = wrapWithReanimatedMetroConfig(config);
