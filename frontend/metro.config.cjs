// eslint-disable @typescript-eslint/oldrules/consistent-type-imports
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
// eslint-disable @typescript-eslint/oldrules/consistent-type-imports
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
// Temporarily using standard Expo config instead of Sentry config
// const config = getDefaultConfig(__dirname, {
// 	// Enable Hermes as the default JavaScript engine
// 	isCSSEnabled: true
// });
const config = getSentryExpoConfig(__dirname);

// Only watch files in the frontend directory
config.watchFolders = [__dirname];

// Ignore backend files
config.resolver.blockList = [
	/backend\/.*/,
	/\.git\/.*/,
	/node_modules\/.*\/node_modules\/.*/,
];

// Add any custom configuration here
config.resolver.sourceExts.push('mjs');
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['browser', 'require', 'import', 'node'];

// NOTE: Do i need this here since it's in the bableconfig?
// config.resolver.extraNodeModules = {
// 	'@assets': path.resolve(__dirname, 'assets')
// };

// Wrap the config
module.exports = wrapWithReanimatedMetroConfig(config);
