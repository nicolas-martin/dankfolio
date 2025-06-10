import { StyleSheet } from 'react-native';

export const createOdometerStyles = () => StyleSheet.create({
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