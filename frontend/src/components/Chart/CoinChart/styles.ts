import styled from 'styled-components/native';
import { theme } from '../../../utils/theme';

export const ChartContainer = styled.View`
  background-color: ${theme.colors.surface};
  height: 300px;
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  overflow: hidden;
`;