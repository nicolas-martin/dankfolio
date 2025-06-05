const { withAppDelegate } = require('@expo/config-plugins');

module.exports = function withSwapAppCheckOrder(config) {
	return withAppDelegate(config, (config) => {
		if (
			config.modResults.language === 'swift' &&
			config.modResults.contents.includes('FirebaseApp.configure()') &&
			config.modResults.contents.includes('RNFBAppCheckModule.sharedInstance()')
		) {
			config.modResults.contents = swapAppCheckInitOrder(config.modResults.contents);
		}
		return config;
	});
};

function swapAppCheckInitOrder(contents) {
	const regex = new RegExp(
		'(\\/\\/ @generated begin @react-native-firebase\\/app-check[\\s\\S]*?)' +
		'FirebaseApp\\.configure\\(\\)\\s*\\n\\s*' +
		'RNFBAppCheckModule\\.sharedInstance\\(\\)\\s*' +
		'(\\n[\\s\\S]*?\\/\\/ @generated end @react-native-firebase\\/app-check)',
		'm'
	);

	return contents.replace(regex, (match, start, end) => {
		return `${start}RNFBAppCheckModule.sharedInstance()\n    FirebaseApp.configure()${end}`;
	});
}
