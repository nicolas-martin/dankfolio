import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import pluginTs from '@typescript-eslint/eslint-plugin';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginUnusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier';
// @ts-expect-error no types available
import pluginReactNative from 'eslint-plugin-react-native';
// @ts-expect-error no types available
import pluginReactPerf from 'eslint-plugin-react-perf';
// @ts-expect-error no types available
import globals from 'globals';

export default [
	js.configs.recommended,
	// Global ignores - must be in separate config object
	{
		ignores: [
			'**/gen/**',
			'**/metro.config.js',
			// Ignore critical chart components to prevent ESLint changes
			'src/components/Chart/CoinChart/**',
			'src/components/Chart/SparklineChart/**',
		],
	},
	{
		languageOptions: {
			parser,
			parserOptions: {
				sourceType: 'module',
				ecmaVersion: 'latest',
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.jest,
				...pluginReactNative.environments['react-native'].globals,
			},
		},

		plugins: {
			'react-perf': pluginReactPerf,
			'@typescript-eslint': pluginTs,
			react: pluginReact,
			'react-hooks': pluginReactHooks,
			'react-native': pluginReactNative,
			'unused-imports': pluginUnusedImports,
		},

		rules: {
			...pluginTs.configs.recommended.rules,
			...pluginReact.configs.recommended.rules,
			...pluginReactHooks.configs.recommended.rules,
			...pluginReactNative.configs.all.rules,
			...prettier.rules,
			// 'react-perf/jsx-no-new-function-as-prop': 'warn',
			'react-perf/jsx-no-new-object-as-prop': 'warn',
			'react-perf/jsx-no-new-array-as-prop': 'warn',

			// optional: stylistic or advanced
			// 'react-perf/jsx-no-jsx-as-prop': 'warn',
			// 'react-perf/jsx-no-useless-fragment': 'warn',
			// 'react-perf/jsx-no-multiline-js': 'warn',

			'react/react-in-jsx-scope': 'off',

			// Auto-fix unused imports
			'unused-imports/no-unused-imports': 'error',

			'@typescript-eslint/no-unused-vars': 'off',
			// Auto-fix unused vars (removes them instead of just warning)
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],
		},

		settings: {
			react: {
				version: 'detect',
			},
		},
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		rules: {
			'react/prop-types': 'off',
		},
	},
	{
		files: ['**/styles.ts', '**/*_style*.ts'],
		rules: {
			'react-native/no-color-literals': 'off',
		},
	},
];

