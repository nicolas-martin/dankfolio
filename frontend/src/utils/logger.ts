import * as Sentry from '@sentry/react-native';
import type { SeverityLevel } from '@sentry/react-native';

type LogLevel = 'log' | 'info' | 'warn' | 'error';

// Default minimum log level
const DEFAULT_MIN_LEVEL: LogLevel = 'info';
let minLogLevel: LogLevel = DEFAULT_MIN_LEVEL;

// Log level priorities for comparison
const levelPriorities: Record<LogLevel, number> = {
	log: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const levelMap: Record<LogLevel, SeverityLevel> = {
	log: 'info',
	info: 'info',
	warn: 'warning',
	error: 'error',
};

function shouldLog(level: LogLevel): boolean {
	return levelPriorities[level] >= levelPriorities[minLogLevel];
}

function logToConsole(level: LogLevel, ...args: unknown[]) {
	if (__DEV__ && shouldLog(level)) {
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
		if (!shouldLog('log')) return;
		logToConsole('log', ...args);
		if (!__DEV__) captureSentry('log', args);
	},

	info: (...args: unknown[]) => {
		if (!shouldLog('info')) return;
		logToConsole('info', ...args);
		if (!__DEV__) captureSentry('info', args);
	},

	warn: (...args: unknown[]) => {
		if (!shouldLog('warn')) return;
		logToConsole('warn', ...args);
		if (!__DEV__) captureSentry('warn', args);
	},

	error: (...args: unknown[]) => {
		if (!shouldLog('error')) return;
		logToConsole('error', ...args);
		if (!__DEV__) captureSentry('error', args);
	},

	setMinLevel: (level: LogLevel) => {
		minLogLevel = level;
	},

	getMinLevel: () => minLogLevel,

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


