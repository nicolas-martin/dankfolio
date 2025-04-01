import React, { useState } from 'react';
import { View } from 'react-native';
import { Pie, PolarChart, VictoryContainer } from "victory-native";
import { WalletDonutProps, ChartData } from './types';
import {
  DonutContainer,
  CenterTextContainer,
  TotalBalance,
  TotalLabel,
  Legend,
  LegendItem,
  ColorIndicator,
  LegendText,
} from './styles';
import { prepareChartData, formatBalance } from './scripts';

const WalletDonut: React.FC<WalletDonutProps> = ({ tokens, totalBalance }) => {
  const chartData = prepareChartData(tokens);
  const [activeSlice, setActiveSlice] = useState<ChartData | null>(null);

  return (
    <View>
      <DonutContainer>
        <View style={{ width: '100%', height: 300 }}>
          <PolarChart
            data={chartData}
            labelKey="x"
            valueKey="y"
            colorKey="color"
            containerComponent={
              <VictoryContainer
                onMouseOver={(evt: any, targetProps: any) => {
                  const slice = targetProps.datum as ChartData;
                  setActiveSlice(slice);
                }}
                onMouseOut={() => {
                  setActiveSlice(null);
                }}
              />
            }
          >
            <Pie.Chart
              innerRadius="60%"
            >
              {({ slice }) => (
                <>
                  <Pie.Slice
                    style={{
                      fill: slice.color,
                      fillOpacity: activeSlice?.x === slice.x ? 1 : 0.8
                    }}
                  >
                    <Pie.Label color="white" />
                  </Pie.Slice>
                  <Pie.SliceAngularInset
                    angularInset={{
                      angularStrokeWidth: 2,
                      angularStrokeColor: '#1E1E1E',
                    }}
                  />
                </>
              )}
            </Pie.Chart>
          </PolarChart>
        </View>
        <CenterTextContainer>
          <TotalBalance>
            {activeSlice ? formatBalance(activeSlice.value) : formatBalance(totalBalance)}
          </TotalBalance>
          <TotalLabel>
            {activeSlice ? activeSlice.x : 'Total Balance'}
          </TotalLabel>
        </CenterTextContainer>
      </DonutContainer>

      <Legend>
        {chartData.map((data, index) => (
          <LegendItem 
            key={index}
            style={{ 
              opacity: activeSlice ? (activeSlice.x === data.x ? 1 : 0.5) : 1 
            }}
          >
            <ColorIndicator color={data.color} />
            <LegendText>{data.x} ({data.y}%)</LegendText>
          </LegendItem>
        ))}
      </Legend>
    </View>
  );
};

export default WalletDonut; 