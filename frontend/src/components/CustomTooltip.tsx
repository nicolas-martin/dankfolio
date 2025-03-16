// CustomTooltip.tsx
import React from "react";
import { VictoryTooltip as VT } from "victory-native";

const CustomTooltip = (props: any) => {
        // Filter out props that cause warnings on web
        const { accessibilityHint, onTouchPinch, ...filteredProps } = props;
        return <VT {...filteredProps} />;
};

export default CustomTooltip;
