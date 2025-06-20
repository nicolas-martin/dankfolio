import * as Sentry from '@sentry/react-native';
import type { SeverityLevel } from '@sentry/react-native';

type LogLevel = 'log' | 'info' | 'warn' | 'error';

const levelMap: Record<LogLevel, SeverityLevel> = {
	log: 'info',
	info: 'info',
	warn: 'warning',
	error: 'error',
};

function logToConsole(level: LogLevel, ...args: unknown[]) {
	if (__DEV__) {
		console[level](...args);
	}
}

function captureSentry(level: LogLevel, args: unknown[]) {
	const msg = args.map(a => {
		if (typeof a === 'string') {
			return a;
		}
		try {
			// Use JSON.stringify with a replacer for BigInt and cyclical references
			return JSON.stringify(a, (key, value) => {
				if (typeof value === 'bigint') {
					return value.toString(); // Convert BigInt to string
				}
				return value; // Return other values unchanged
			});
		} catch (error) {
			// Handle cyclical structure errors
			if (error instanceof Error && error.message.includes('cyclical')) {
				return `[Cyclical Object: ${typeof a}]`;
			}
			// For other errors, return a safe string representation
			return `[Object: ${typeof a}]`;
		}
	}).join(' ');

	if (level === 'error') {
		Sentry.captureMessage(msg, 'error');
	} else {
		Sentry.addBreadcrumb({
			category: 'log',
			level: levelMap[level],
			message: msg,
		});
	}
}

export const logger = {
	log: (...args: unknown[]) => {
		logToConsole('log', ...args);
		if (!__DEV__) captureSentry('log', args);
	},

	info: (...args: unknown[]) => {
		logToConsole('info', ...args);
		if (!__DEV__) captureSentry('info', args);
	},

	warn: (...args: unknown[]) => {
		logToConsole('warn', ...args);
		if (!__DEV__) captureSentry('warn', args);
	},

	error: (...args: unknown[]) => {
		logToConsole('error', ...args);
		if (!__DEV__) captureSentry('error', args);
	},

	exception: (error: unknown, context?: Record<string, unknown>) => {
		if (__DEV__) {
			console.error(error);
			if (context) console.info('context:', context);
		}

		if (!__DEV__) {
			if (context) Sentry.setContext('exception-context', context);
			Sentry.captureException(error);
		}
	},

	breadcrumb: (
		messageOrOptions: { message: string; category?: string; level?: LogLevel; data?: Record<string, unknown> },
	) => {
		if (!__DEV__) {
			Sentry.addBreadcrumb({
				message: messageOrOptions.message,
				category: messageOrOptions.category || 'app',
				level: levelMap[messageOrOptions.level || 'info'],
				data: messageOrOptions.data,
			});
		}
	},
};


