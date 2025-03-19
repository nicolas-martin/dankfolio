import React from "react";
import { VictoryChart, VictoryBar, VictoryTheme } from 'victory-native';

const ChartTestScreen = () => {
  const data = [
    { quarter: 1, earnings: 13000 },
    { quarter: 2, earnings: 16500 },
    { quarter: 3, earnings: 14250 },
    { quarter: 4, earnings: 19000 }
  ];

  return (
      <VictoryChart width={350} >
        <VictoryBar data={data} x="quarter" y="earnings" />
      </VictoryChart>
  );
};


export default ChartTestScreen; 