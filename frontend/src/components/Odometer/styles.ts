import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    left: -9999,
  },
  digitContainer: {
    overflow: 'hidden',
  },
  digitColumn: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  separator: {
    alignSelf: 'flex-end',
  }
}); 