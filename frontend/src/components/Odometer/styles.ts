import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
  digitColumn: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  digitContainer: {
    overflow: 'hidden',
  },
  hidden: {
    left: -9999,
    opacity: 0,
    position: 'absolute',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  separator: {
    alignSelf: 'flex-end',
  }
}); 