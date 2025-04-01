import { StyleSheet } from 'react-native';
import styled from 'styled-components/native';

export const DonutContainer = styled.View`
  position: relative;
  width: 200px;
  height: 200px;
  margin: 20px auto;
  align-items: center;
  justify-content: center;
`;

export const CenterTextContainer = styled.View`
  position: absolute;
  width: 120px;
  height: 120px;
  align-items: center;
  justify-content: center;
  z-index: 1;
`;

export const TotalBalance = styled.Text`
  font-size: 24px;
  font-weight: bold;
  color: white;
  margin-bottom: 4px;
  text-align: center;
`;

export const TotalLabel = styled.Text`
  font-size: 14px;
  color: #888;
  text-align: center;
`;

export const Legend = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
`;

export const LegendItem = styled.View`
  flex-direction: row;
  align-items: center;
  margin: 4px;
`;

export const ColorIndicator = styled.View<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background-color: ${(props: { color: string }) => props.color};
  margin-right: 8px;
`;

export const LegendText = styled.Text`
  color: white;
  font-size: 14px;
`; 