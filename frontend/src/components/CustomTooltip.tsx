import React from 'react';
import { G, Rect, Text as SvgText } from 'react-native-svg';

interface CustomTooltipProps {
  x?: number;
  y?: number;
  text?: string; // Tooltip text
  style?: object;
}

// A custom tooltip component designed for Victory charts in React Native using react-native-svg.
// It displays the tooltip text within an SVG group along with a background rectangle.
const CustomTooltip: React.FC<CustomTooltipProps> = ({ x, y, text = 'Tooltip', style }) => {
  // Determine position; defaults to 0 if not provided
  const tooltipX = x || 0;
  const tooltipY = y || 0;
  const padding = 4;
  const tooltipWidth = 100;  // Fixed width for tooltip background
  const tooltipHeight = 30;  // Fixed height for tooltip background

  return (
    <G x={tooltipX - tooltipWidth / 2} y={tooltipY - tooltipHeight - 10}>
      <Rect
        width={tooltipWidth}
        height={tooltipHeight}
        fill="rgba(0, 0, 0, 0.75)"
        rx={4}
        ry={4}
      />
      <SvgText
        x={tooltipWidth / 2}
        y={tooltipHeight / 2 + padding}
        fill="#fff"
        fontSize="12"
        textAnchor="middle"
      >
        {text}
      </SvgText>
    </G>
  );
};

export default CustomTooltip; 