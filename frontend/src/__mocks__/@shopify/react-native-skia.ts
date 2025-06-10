import React from 'react';
import { View, type ViewProps } from 'react-native';

const mockComponent = (name: string) => {
	return jest.fn((props: ViewProps) => React.createElement(View, { ...props, testID: name }));
};

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
	Canvas: mockComponent('Canvas'),
	Fill: mockComponent('Fill'),
	Path: mockComponent('Path'),
	Line: mockComponent('Line'),
	Circle: mockComponent('Circle'),
	Group: mockComponent('Group'),
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
