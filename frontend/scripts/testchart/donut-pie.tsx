import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View, Text } from "react-native";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import { Pie, PolarChart } from "victory-native";
import { useTheme, MD3Theme, Button, Card } from "react-native-paper";

function calculateGradientPoints(
  radius: number,
  startAngle: number,
  endAngle: number,
  centerX: number,
  centerY: number,
) {
  // Calculate the midpoint angle of the slice for a central gradient effect
  const midAngle = (startAngle + endAngle) / 2;

  // Convert angles from degrees to radians
  const startRad = (Math.PI / 180) * startAngle;
  const midRad = (Math.PI / 180) * midAngle;

  // Calculate start point (inner edge near the pie's center)
  const startX = centerX + radius * 0.5 * Math.cos(startRad);
  const startY = centerY + radius * 0.5 * Math.sin(startRad);

  // Calculate end point (outer edge of the slice)
  const endX = centerX + radius * Math.cos(midRad);
  const endY = centerY + radius * Math.sin(midRad);

  return { startX, startY, endX, endY };
}

const randomNumber = () => Math.floor(Math.random() * (50 - 25 + 1)) + 125;
function generateRandomColor(): string {
  // Generating a random number between 0 and 0xFFFFFF
  const randomColor = Math.floor(Math.random() * 0xffffff);
  // Converting the number to a hexadecimal string and padding with zeros
  return `#${randomColor.toString(16).padStart(6, "0")}`;
}

const DATA = (numberPoints = 5) =>
  Array.from({ length: numberPoints }, (_, index) => ({
    value: randomNumber(),
    color: generateRandomColor(),
    label: `Label ${index + 1}`,
  }));

function descriptionForRoute(segment: string): string {
  return `Chart showing data for ${segment}`;
}

const createStyles = (theme: MD3Theme) => StyleSheet.create({
  safeView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chartContainer: {
    height: 400,
    padding: 25,
  },
});

export default function DonutChart(props: { segment: string }) {
  const description = descriptionForRoute(props.segment);
  const [data, setData] = useState(DATA(5));
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.safeView}>
      <ScrollView>
        <View style={styles.chartContainer}>
          <PolarChart
            data={data}
            colorKey={"color"}
            valueKey={"value"}
            labelKey={"label"}
          >
            <Pie.Chart innerRadius={"50%"}>
              {({ slice }) => {
                const { startX, startY, endX, endY } = calculateGradientPoints(
                  slice.radius,
                  slice.startAngle,
                  slice.endAngle,
                  slice.center.x,
                  slice.center.y,
                );

                return (
                  <>
                    <Pie.Slice animate={{ type: "spring" }}>
                      <LinearGradient
                        start={vec(startX, startY)}
                        end={vec(endX, endY)}
                        colors={[slice.color, `${slice.color}50`]}
                        positions={[0, 1]}
                      />
                    </Pie.Slice>
                    <Pie.SliceAngularInset
                      animate={{ type: "spring" }}
                      angularInset={{
                        angularStrokeWidth: 5,
                        angularStrokeColor: theme.colors.onSurface,
                      }}
                    />
                  </>
                );
              }}
            </Pie.Chart>
          </PolarChart>
        </View>

        <View style={{ flexGrow: 1, padding: 15 }}>
          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <Text>{description}</Text>
            </Card.Content>
          </Card>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 10,
              marginBottom: 16,
            }}
          >
            <Button
              mode="contained"
              onPress={() => setData((data) => DATA(data.length))}
            >
              Shuffle Data
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
