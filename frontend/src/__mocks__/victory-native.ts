import React, { ReactNode } from 'react';
import { View, ViewProps } from 'react-native';

interface ChartBounds {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

interface ChartPoints {
	y: Array<{ x: number; y: number }>;
}

interface RenderProps {
	chartBounds: ChartBounds;
	points: ChartPoints;
}

type ChartChildren = ReactNode | ((props: RenderProps) => ReactNode);

interface ChartProps extends Omit<ViewProps, 'children'> {
	children?: ChartChildren;
	renderOutside?: (props: { chartBounds: ChartBounds }) => ReactNode;
	[key: string]: any;
}

const mockChartBounds: ChartBounds = {
	top: 0,
	bottom: 250,
	left: 0,
	right: 400
};

const mockPoints: ChartPoints = {
	y: [{ x: 0, y: 0 }]
};

const renderChildren = (children: ChartChildren | undefined): ReactNode => {
	if (typeof children === 'function') {
		return children({ chartBounds: mockChartBounds, points: mockPoints });
	}
	return children;
};

module.exports = {
	CartesianChart: ({ children, renderOutside, ...props }: ChartProps) => {
		const viewProps: ViewProps = { ...props };
		return React.createElement(View, viewProps, [
			renderChildren(children),
			renderOutside?.({ chartBounds: mockChartBounds })
		]);
	},
	useChartPressState: jest.fn(() => ({
		state: {
			x: { value: { value: 100 }, position: 100 },
			y: { y: { value: { value: 50 }, position: 50 } }
		},
		isActive: true
	})),
	Area: ({ children, ...props }: ChartProps) => {
		const viewProps: ViewProps = { ...props };
		return React.createElement(View, viewProps, renderChildren(children));
	},
	Line: ({ children, ...props }: ChartProps) => {
		const viewProps: ViewProps = { testID: 'victory-line', ...props };
		return React.createElement(View, viewProps, renderChildren(children));
	},
}; 