import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { EdgeInsets } from 'react-native-safe-area-context';

export const createStyles = (theme: MD3Theme, insets: EdgeInsets) => {
  return StyleSheet.create({
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: 8,
    },
    messageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    message: {
      marginLeft: 8,
      flex: 1,
    },
    closeButton: {
      padding: 4,
      marginLeft: 8,
    },
    statusIcon: {
      marginRight: 8,
    },
  });
}; 