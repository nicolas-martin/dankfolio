import React, { useMemo } from 'react'; // Add useMemo
import { View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useStyles } from './InfoState.styles';
import { LoadingAnimation } from './Animations'; // Assuming a Lottie loading animation

interface InfoStateProps {
  isLoading?: boolean;
  error?: Error | string | null;
  emptyMessage?: string;
  iconName?: string; // For empty/error states, e.g., 'alert-circle-outline', 'information-outline'
  title?: string;
}

const InfoState: React.FC<InfoStateProps> = ({
  isLoading,
  error,
  emptyMessage,
  iconName,
  title,
}) => {
  const styles = useStyles();

  // All hooks must be at top level before any conditional returns
  const errorTitleStyle = useMemo(() => [
      styles.title,
      styles.errorText
  ], [styles.title, styles.errorText]);

  const errorMessageStyle = useMemo(() => [
      styles.message,
      styles.errorText
  ], [styles.message, styles.errorText]);

  if (isLoading) {
    return (
      <View style={styles.container} testID="info-state-loading">
        {/* Using Lottie animation as preferred, fallback to ActivityIndicator if not available */}
        <LoadingAnimation size={80} />
        {/* <ActivityIndicator size="large" color={styles.message.color} /> */}
      </View>
    );
  }

  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;

    return (
      <View style={styles.container} testID="info-state-error">
        <View style={styles.iconContainer}>
          <Icon source={iconName || "alert-circle-outline"} size={48} color={styles.errorText.color} />
        </View>
        <Text style={errorTitleStyle}>{title || 'Error'}</Text>
        <Text style={errorMessageStyle}>{errorMessage}</Text>
      </View>
    );
  }

  if (emptyMessage) {
    return (
      <View style={styles.container} testID="info-state-empty">
        {iconName && (
          <View style={styles.iconContainer}>
            <Icon source={iconName} size={48} color={styles.message.color} />
          </View>
        )}
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.message}>{emptyMessage}</Text>
      </View>
    );
  }

  return null; // Or some default state if needed when no props match
};

export default InfoState;
