import log from 'loglevel';
import { DEBUG_MODE } from '@env'; // Assuming DEBUG_MODE is 'true' or 'false' string

// Default to WARN if DEBUG_MODE is not set or is not 'true'
let logLevel: log.LogLevelDesc = log.levels.WARN;

if (DEBUG_MODE === 'true') {
	logLevel = log.levels.DEBUG;
}

log.setLevel(logLevel);

// You can add more configurations here, like custom formatters if needed
// For example, to prefix logs with the level:
// const originalFactory = log.methodFactory;
// log.methodFactory = (methodName, logLevel, loggerName) => {
//   const rawMethod = originalFactory(methodName, logLevel, loggerName);
//   return (message) => {
//     rawMethod(`[${methodName.toUpperCase()}] ${message}`);
//   };
// };
// log.setLevel(log.getLevel()); // Apply the changes

export default log;
