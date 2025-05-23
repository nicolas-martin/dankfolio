const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
const {
    getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname, {
	// Enable Hermes as the default JavaScript engine
	isCSSEnabled: true
});

// NOTE: Do i need this here since it's in the bableconfig?
// config.resolver.extraNodeModules = {
// 	'@assets': path.resolve(__dirname, 'assets')
// };

// Add any custom configuration here
config.resolver.sourceExts.push('mjs');
config.resolver.unstable_enablePackageExports = true;
	
// Wrap the config
module.exports = wrapWithReanimatedMetroConfig(config);