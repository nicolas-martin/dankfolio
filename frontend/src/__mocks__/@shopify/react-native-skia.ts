export { };

interface TurboModuleRegistry {
	getEnforcing: () => {
		install: () => void;
	};
}

declare global {
	var TurboModuleRegistry: TurboModuleRegistry;
}

// Mock TurboModuleRegistry if not already mocked
if (!global.TurboModuleRegistry) {
	global.TurboModuleRegistry = {
		getEnforcing: () => ({
			install: () => { },
		}),
	};
}

module.exports = {
	Canvas: 'Canvas',
	Fill: 'Fill',
	Path: 'Path',
	useFont: () => ({ fontFamily: 'mock-font' }),
	Skia: {
		Path: {
			Make: () => ({
				moveTo: () => { },
				lineTo: () => { },
				close: () => { },
			}),
		},
	},
}; 
