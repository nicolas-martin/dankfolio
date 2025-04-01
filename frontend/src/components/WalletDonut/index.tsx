import React from "react";
import { StyleSheet, View } from "react-native";
import { Pie, PolarChart } from "victory-native";
import { useTheme, MD3Theme } from "react-native-paper";
import { TokenInfo } from "../../services/api";
import { createStyles } from "./donut_style";
import Color from 'color';

interface ChartDataItem extends Record<string, unknown> {
  value: number;
  color: string;
  label: string;
  token: TokenInfo;
}

interface WalletDonutProps {
  tokens: TokenInfo[];
  totalBalance: number;
}

export default function WalletDonut({ tokens, totalBalance }: WalletDonutProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  if (!tokens.length || !totalBalance) {
    return null;
  }

  const chartData: ChartDataItem[] = tokens.map((token) => ({
    value: (token.value / totalBalance) * 100,
    color: generateTokenColor(token.symbol, theme),
    label: token.symbol,
    token,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <PolarChart
          data={chartData}
          colorKey={"color"}
          valueKey={"value"}
          labelKey={"label"}
        >
          <Pie.Chart
            innerRadius={"50%"}
          >
            {({ slice }) => (
              <Pie.Slice
                animate={{ type: "spring" }}
              >
                <Pie.Label />
              </Pie.Slice>
            )}
          </Pie.Chart>
        </PolarChart>
      </View>
    </View>
  );
}

function generateTokenColor(symbol: string, theme: MD3Theme): string {
  // Create a palette of colors based on theme
  const baseColors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.tertiary,
    theme.colors.primaryContainer,
    theme.colors.secondaryContainer,
    theme.colors.tertiaryContainer,
  ];

  // Generate variations of each color
  const colorPalette = baseColors.flatMap(baseColor => {
    const color = Color(baseColor);
    return [
      color.lighten(0.2).hex(),
      color.hex(),
      color.darken(0.2).hex()
    ];
  });

  // Use the symbol to deterministically pick a color
  const hash = symbol.split("").reduce((acc, char) => {
    acc = (acc << 5) - acc + char.charCodeAt(0);
    return acc & acc;
  }, 0);

  return colorPalette[Math.abs(hash) % colorPalette.length];
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}