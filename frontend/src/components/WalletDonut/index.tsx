import React from 'react';
import { View } from 'react-native';
import { Pie, PolarChart } from "victory-native";
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

  return (
    <View>
      <DonutContainer>
        <View style={{ width: '100%', height: 300 }}>
          <PolarChart
            data={chartData}
            labelKey="x"
            valueKey="y"
            colorKey="color"
          >
            <Pie.Chart
              innerRadius="60%"
            >
              {({ slice }) => (
                <>
                  <Pie.Slice>
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
          <TotalBalance>{formatBalance(totalBalance)}</TotalBalance>
          <TotalLabel>Total Balance</TotalLabel>
        </CenterTextContainer>
      </DonutContainer>

      <Legend>
        {chartData.map((data, index) => (
          <LegendItem key={index}>
            <ColorIndicator color={data.color} />
            <LegendText>{data.x} ({data.y}%)</LegendText>
          </LegendItem>
        ))}
      </Legend>
    </View>
  );
};

export default WalletDonut; 