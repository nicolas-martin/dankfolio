import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { AmountPercentageButtonsProps } from './types';
import { useStyles } from './styles'; // Using useStyles hook pattern

const percentages = [25, 50, 75, 100];

const AmountPercentageButtons: React.FC<AmountPercentageButtonsProps> = ({
  balance,
  onSelectAmount,
  style,
}) => {
  const theme = useTheme();
  const styles = useStyles(); // Hook for styles
  const [activePercent, setActivePercent] = useState<number | null>(null);

  const handlePress = (percent: number) => {
    setActivePercent(percent);
    
    if (balance === undefined || balance === null || balance <= 0) {
      onSelectAmount('0'); // Or handle as per original Send screen logic for no balance
      return;
    }

    const calculatedAmount = (balance * percent) / 100;
    // Formatting logic adapted from Send/index.tsx (turn 23)
    let amountStr = calculatedAmount.toFixed(9); // Max 9 decimal places
    amountStr = parseFloat(amountStr).toString(); // Removes trailing zeros after decimal

    // Length check from Send/index.tsx
    if (amountStr.length > 12) {
        amountStr = amountStr.substring(0, 12);
        if (amountStr.endsWith('.')) {
            amountStr = amountStr.substring(0, 11);
        }
    }
    onSelectAmount(amountStr);
  };

  return (
    <View style={[styles.container, style]}>
      {percentages.map((percent) => {
        const isActive = activePercent === percent;
        return (
          <TouchableOpacity
            key={percent}
            style={[
              styles.percentageButton,
              isActive && styles.activeButton
            ]}
            onPress={() => handlePress(percent)}
            testID={`amount-percentage-button-${percent}`}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            accessibilityRole="button"
          >
            <Text 
              style={[
                styles.percentageButtonText,
                isActive && { color: theme.colors.onPrimary }
              ]}
              testID={`amount-percentage-text-${percent}`}
            >
              {percent}%
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default AmountPercentageButtons;
