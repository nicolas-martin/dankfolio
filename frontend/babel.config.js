module.exports = function (api) {
	api.cache(true);
	return {
		presets: [
			['babel-preset-expo', {
				unstable_transformImportMeta: true
			}],
			'@babel/preset-typescript'
		],
		plugins: [
			['@emotion'],
			'react-native-reanimated/plugin',
			'babel-plugin-transform-import-meta',
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
