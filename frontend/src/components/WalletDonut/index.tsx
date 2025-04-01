import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import { Pie, PolarChart } from "victory-native";
import { usePortfolioStore } from "../../store/portfolio";
import { TokenInfo } from "../../services/api";

function calculateGradientPoints(
  radius: number,
  startAngle: number,
  endAngle: number,
  centerX: number,
  centerY: number,
) {
  const midAngle = (startAngle + endAngle) / 2;
  const startRad = (Math.PI / 180) * startAngle;
  const midRad = (Math.PI / 180) * midAngle;

  const startX = centerX + radius * 0.5 * Math.cos(startRad);
  const startY = centerY + radius * 0.5 * Math.sin(startRad);
  const endX = centerX + radius * Math.cos(midRad);
  const endY = centerY + radius * Math.sin(midRad);

  return { startX, startY, endX, endY };
}

interface HoverInfo {
  token: TokenInfo;
  x: number;
  y: number;
}

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
  const [hoveredToken, setHoveredToken] = useState<HoverInfo | null>(null);

  if (!tokens.length || !totalBalance) {
    return null;
  }

  const chartData: ChartDataItem[] = tokens.map((token) => ({
    value: (token.value / totalBalance) * 100,
    color: generateTokenColor(token.symbol),
    label: token.symbol,
    token,
  }));

  const handleSlicePress = (token: TokenInfo, center: { x: number; y: number }) => {
    setHoveredToken({
      token,
      x: center.x,
      y: center.y,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <PolarChart
          data={chartData}
          colorKey={"color"}
          valueKey={"value"}
          labelKey={"label"}
        >
          <Pie.Chart innerRadius={"50%"}>
            {({ slice }: any) => {
              const sliceData = slice as {
                radius: number;
                startAngle: number;
                endAngle: number;
                center: { x: number; y: number };
                color: string;
                data: ChartDataItem;
              };
              
              const { startX, startY, endX, endY } = calculateGradientPoints(
                sliceData.radius,
                sliceData.startAngle,
                sliceData.endAngle,
                sliceData.center.x,
                sliceData.center.y,
              );

              return (
                <TouchableOpacity
                  onPress={() =>
                    handleSlicePress(sliceData.data.token, sliceData.center)
                  }
                >
                  <Pie.Slice animate={{ type: "spring" }}>
                    <LinearGradient
                      start={vec(startX, startY)}
                      end={vec(endX, endY)}
                      colors={[sliceData.color, `${sliceData.color}50`]}
                      positions={[0, 1]}
                    />
                  </Pie.Slice>
                  <Pie.SliceAngularInset
                    animate={{ type: "spring" }}
                    angularInset={{
                      angularStrokeWidth: 5,
                      angularStrokeColor: "white",
                    }}
                  />
                </TouchableOpacity>
              );
            }}
          </Pie.Chart>
        </PolarChart>

        {hoveredToken && (
          <View
            style={[
              styles.tooltip,
              {
                position: "absolute",
                left: hoveredToken.x,
                top: hoveredToken.y,
              },
            ]}
          >
            <Text style={styles.tokenSymbol}>
              {hoveredToken.token.symbol.toUpperCase()}
            </Text>
            <Text style={styles.tokenBalance}>
              Balance: {formatNumber(hoveredToken.token.balance)}
            </Text>
            <Text style={styles.tokenValue}>
              Value: ${formatNumber(hoveredToken.token.value)}
            </Text>
            <Text style={styles.tokenPercentage}>
              {((hoveredToken.token.value / totalBalance) * 100).toFixed(2)}% of Portfolio
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function generateTokenColor(symbol: string): string {
  const hash = symbol.split("").reduce((acc, char) => {
    acc = (acc << 5) - acc + char.charCodeAt(0);
    return acc & acc;
  }, 0);
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartContainer: {
    height: 400,
    padding: 25,
    position: "relative",
  },
  tooltip: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    transform: [{ translateX: -100 }, { translateY: -80 }],
    minWidth: 200,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  tokenBalance: {
    fontSize: 14,
    marginBottom: 2,
  },
  tokenValue: {
    fontSize: 14,
    marginBottom: 2,
  },
  tokenPercentage: {
    fontSize: 14,
    color: "#666",
  },
});