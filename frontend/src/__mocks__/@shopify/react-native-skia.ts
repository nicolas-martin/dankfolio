// Mock TurboModuleRegistry if not already mocked
if (!global.TurboModuleRegistry) {
	(global as any).TurboModuleRegistry = {
		getEnforcing: () => ({
			install: () => { },
		}),
	};
}

module.exports = {
	Canvas: 'Canvas',
	Fill: 'Fill',
	Path: 'Path',
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