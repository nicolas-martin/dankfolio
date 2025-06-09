import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import pluginTs from '@typescript-eslint/eslint-plugin';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactNative from 'eslint-plugin-react-native';
import pluginUnusedImports from 'eslint-plugin-unused-imports';
import detox from 'eslint-plugin-detox';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
	js.configs.recommended,

	{
		ignores: ['src/gen/**'],
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
			'@typescript-eslint': pluginTs,
			react: pluginReact,
			'react-hooks': pluginReactHooks,
			'react-native': pluginReactNative,
			'unused-imports': pluginUnusedImports,
			'detox': detox,
		},

		rules: {
			...pluginTs.configs.recommended.rules,
			...pluginReact.configs.recommended.rules,
			...pluginReactHooks.configs.recommended.rules,
			...pluginReactNative.configs.all.rules,
			...prettier.rules,

			'react/react-in-jsx-scope': 'off',

			// Auto-fix unused imports
			'unused-imports/no-unused-imports': 'error',

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
		files: ['**/styles.ts', '**/*_style*.ts'],
		rules: {
			'react-native/no-color-literals': 'off',
		},
	},
];

