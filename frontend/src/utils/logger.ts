import * as Sentry from '@sentry/react-native';
import type { SeverityLevel } from '@sentry/react-native';

type LogLevel = 'log' | 'info' | 'warn' | 'error';

const levelMap: Record<LogLevel, SeverityLevel> = {
	log: 'info',
	info: 'info',
	warn: 'warning',
	error: 'error',
};

function logToConsole(level: LogLevel, ...args: any[]) {
	if (__DEV__) {
		console[level](...args);
	}
}

function captureSentry(level: LogLevel, args: any[]) {
	const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');

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
	log: (...args: any[]) => {
		logToConsole('log', ...args);
		if (!__DEV__) captureSentry('log', args);
	},

	info: (...args: any[]) => {
		logToConsole('info', ...args);
		if (!__DEV__) captureSentry('info', args);
	},

	warn: (...args: any[]) => {
		logToConsole('warn', ...args);
		if (!__DEV__) captureSentry('warn', args);
	},

	error: (...args: any[]) => {
		logToConsole('error', ...args);
		if (!__DEV__) captureSentry('error', args);
	},

	exception: (error: unknown, context?: Record<string, any>) => {
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
		messageOrOptions: { message: string; category?: string; level?: LogLevel; data?: Record<string, any> },
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

