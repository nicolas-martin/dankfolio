import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { EdgeInsets } from 'react-native-safe-area-context';

export const createStyles = (theme: MD3Theme, insets: EdgeInsets) => StyleSheet.create({
  snackbar: {
    position: 'absolute',
    left: insets.left,
    right: insets.right,
    top: insets.top + 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
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
    color: theme.colors.onSurface,
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeIcon: {
    color: theme.colors.onSurfaceVariant,
  },
  statusIcon: {
    margin: 0,
    padding: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
}); 