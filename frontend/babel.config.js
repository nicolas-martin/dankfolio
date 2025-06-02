module.exports = function (api) {
	api.cache(true);
	return {
		presets: [
			'babel-preset-expo',
			'@babel/preset-typescript'
		],
		plugins: [
			['module:react-native-dotenv', {
				moduleName: '@env',
				path: '.env',
				blacklist: null,
				whitelist: null,
				safe: false,
				allowUndefined: true
			}],
			['@emotion'],
			'react-native-reanimated/plugin',
			['module-resolver', {
				root: ['./'],
				alias: {
					'@': './src',
					'@assets': './assets',
					'@components': './src/components',
					'@screens': './src/screens',
					'@store': './src/store',
					'@services': './src/services',
					'@utils': './src/utils',
					'@types': './src/types'
				}
			}]
		]
	};
}; 
